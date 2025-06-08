import { calculateWeight, getWeightInfo, findSimilarItems } from './calculateWeight.js';

/**
 * Clean and normalize multi-line prompt for better parsing
 * @param {string} prompt - Raw user prompt
 * @returns {string} Cleaned prompt
 */
function cleanMultiLinePrompt(prompt) {
  return prompt
    .replace(/•|\t/g, ' ')                    // Replace bullets and tabs with spaces
    .replace(/\n\s*\n/g, '\n')                // Remove extra empty lines
    .replace(/\s+/g, ' ')                     // Normalize multiple spaces
    .replace(/×|x/g, ' x ')                   // Normalize multiplication symbols
    .replace(/₹/g, 'Rs.')                     // Normalize currency symbols
    .trim();
}

/**
 * Extract multi-line structured items with embedded calculations
 * @param {string} prompt - User prompt
 * @returns {Array} Array of structured items
 */
function extractStructuredItems(prompt) {
  const items = [];
  
  // Pattern to match numbered items with calculations:
  // 1. MS Channel 75x40x6mm
  //    • 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
  const structuredPattern = /(\d+)\.\s*([A-Z][^•\n]*?)(?:\n|\s)*•?\s*(\d+(?:\.\d+)?)\s*kg\/m\s*×\s*(\d+)\s*m\s*×\s*(\d+)\s*Nos?\s*=\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*kg/gi;
  
  const structuredMatches = [...prompt.matchAll(structuredPattern)];
  
  for (const match of structuredMatches) {
    const [, itemNumber, description, weightPerMeter, length, quantity, totalWeight] = match;
    
    items.push({
      itemNumber: parseInt(itemNumber),
      description: description.trim(),
      quantity: parseInt(quantity),
      weightPerMeter: parseFloat(weightPerMeter),
      length: parseInt(length),
      totalWeight: parseFloat(totalWeight.replace(/,/g, '')),
      uom: 'Nos',
      hasCalculation: true
    });
  }
  
  // If no structured items found, try simpler patterns
  if (items.length === 0) {
    // Pattern for simple numbered items
    const simplePattern = /(\d+)\.\s*([A-Z][A-Z\s\d\.\-x]+?)(?:\s*-\s*|\s+)(\d+)\s*Nos?/gi;
    const simpleMatches = [...prompt.matchAll(simplePattern)];
    
    for (const match of simpleMatches) {
      const [, itemNumber, description, quantity] = match;
      
      items.push({
        itemNumber: parseInt(itemNumber),
        description: description.trim(),
        quantity: parseInt(quantity),
        uom: 'Nos',
        hasCalculation: false
      });
    }
  }
  
  return items;
}

/**
 * Extract group-based rates (e.g., "Flat - 51+ GST", "ANGLE AND CHANNEL - 50₹+ GST")
 * @param {string} prompt - User prompt
 * @returns {Array} Array of rate groups
 */
function extractGroupRates(prompt) {
  const rates = [];
  
  // Pattern for group rates: "ITEM_TYPE - RATE+ GST"
  const groupRatePattern = /([A-Z\s]+?)\s*-\s*(?:Rs\.?\s*)?(\d+(?:\.\d+)?)\s*[\+₹]*\s*GST/gi;
  
  const matches = [...prompt.matchAll(groupRatePattern)];
  
  for (const match of matches) {
    const [, itemType, rate] = match;
    
    // Clean and split item types
    const types = itemType.trim()
      .split(/\s*(?:AND|&|,)\s*/i)
      .map(type => type.trim().toLowerCase())
      .filter(type => type.length > 0);
    
    for (const type of types) {
      rates.push({
        itemType: type,
        rate: parseFloat(rate),
        rateUom: 'per kg'
      });
    }
  }
  
  return rates;
}

/**
 * Match items with their appropriate group rates based on keywords
 * @param {Array} items - Structured items
 * @param {Array} groupRates - Group-based rates
 * @returns {Array} Items matched with rates
 */
function matchItemsWithGroupRates(items, groupRates) {
  const matchedItems = [];
  
  for (const item of items) {
    let matchedRate = null;
    let bestScore = 0;
    
    // Try to match item description with rate groups
    for (const rateGroup of groupRates) {
      const score = calculateGroupMatchScore(item.description, rateGroup.itemType);
      if (score > bestScore && score > 0.5) { // Minimum 50% match for group rates
        bestScore = score;
        matchedRate = rateGroup;
      }
    }
    
    // Calculate actual weight if not provided in calculation
    let actualWeight = item.totalWeight || 0;
    let weightInfo = null;
    
    if (!item.hasCalculation || actualWeight === 0) {
      // Use our weight calculation system
      actualWeight = calculateWeight(item.description, item.quantity, item.length || 6);
      weightInfo = getWeightInfo(item.description, item.length || 6);
    }
    
    // Calculate amount if rate is available
    const rate = matchedRate ? matchedRate.rate : null;
    const amount = rate && actualWeight ? actualWeight * rate : 0;
    
    matchedItems.push({
      description: item.description,
      quantity: item.quantity,
      uom: item.uom,
      actualWeight: parseFloat(actualWeight.toFixed(2)),
      weightInfo: weightInfo,
      rate: rate,
      rateUom: matchedRate ? matchedRate.rateUom : 'per kg',
      amount: parseFloat(amount.toFixed(2)),
      matchScore: bestScore,
      itemNumber: item.itemNumber,
      hasCalculation: item.hasCalculation,
      warnings: actualWeight === 0 ? [`No weight data found for "${item.description}"`] : []
    });
  }
  
  return matchedItems;
}

/**
 * Calculate match score between item description and rate group type
 * @param {string} description - Item description
 * @param {string} groupType - Rate group type (e.g., "flat", "angle", "channel")
 * @returns {number} Match score between 0 and 1
 */
function calculateGroupMatchScore(description, groupType) {
  const desc = description.toLowerCase();
  const type = groupType.toLowerCase();
  
  // Direct keyword match
  if (desc.includes(type)) {
    return 1.0;
  }
  
  // Special mappings for steel types
  const steelMappings = {
    'flat': ['flat', 'strip'],
    'angle': ['angle', 'isa'],
    'channel': ['channel', 'ismc'],
    'beam': ['beam', 'ismb', 'rsj'],
    'pipe': ['pipe', 'tube'],
    'sheet': ['sheet', 'plate', 'hr', 'cr']
  };
  
  if (steelMappings[type]) {
    for (const keyword of steelMappings[type]) {
      if (desc.includes(keyword)) {
        return 0.9;
      }
    }
  }
  
  return 0;
}

/**
 * Extract additional terms from prompt (transport, payment, delivery)
 * @param {string} prompt - User prompt
 * @returns {object} Extracted terms
 */
function extractAdditionalTerms(prompt) {
  const terms = {
    transport: null,
    loading: null,
    paymentTerms: null,
    deliveryTerms: null,
    customer: null
  };
  
  // Enhanced customer extraction
  const customerPatterns = [
    /(?:Quote\s+to|To)\s+([A-Z][A-Za-z\s&\.]+?)(?:\s*$|\s*\n)/i,
    /(?:customer[:\s]+|for\s+)([A-Z][A-Za-z\s&\.]+?)(?:\s*$|\s*[,\n])/i
  ];
  
  for (const pattern of customerPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      terms.customer = match[1].trim();
      break;
    }
  }
  
  // Transport terms
  const transportPatterns = [
    /transport\s+(extra|included|free)/i,
    /(delivery\s+included|delivery\s+extra)/i,
    /(freight\s+\w+)/i
  ];
  
  for (const pattern of transportPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      terms.transport = match[1] || match[0];
      break;
    }
  }
  
  // Payment terms
  const paymentMatch = prompt.match(/(\d+\s*days?\s*payment|immediate\s*payment|advance\s*payment)/i);
  if (paymentMatch) {
    terms.paymentTerms = paymentMatch[1];
  }
  
  // Loading charges
  const loadingMatch = prompt.match(/(loading\s+[^,\n\.]+)/i);
  if (loadingMatch) {
    terms.loading = loadingMatch[1];
  }
  
  return terms;
}

/**
 * Enhanced parsePrompt function with multi-line support
 * @param {string} userPrompt - The input prompt from the user
 * @returns {object} Parsed data with customer name and items array
 */
export function parsePrompt(userPrompt) {
  const result = {
    customer: null,
    items: [],
    errors: [],
    transport: null,
    loading: null,
    gst: 18,
    paymentTerms: null,
    isStructured: false
  };

  try {
    // Clean the prompt for better parsing
    const cleanedPrompt = cleanMultiLinePrompt(userPrompt);
    
    // Try structured parsing first
    const structuredItems = extractStructuredItems(cleanedPrompt);
    
    if (structuredItems.length > 0) {
      // Found structured items, use enhanced parsing
      result.isStructured = true;
      
      // Extract group rates
      const groupRates = extractGroupRates(cleanedPrompt);
      
      // Match items with group rates
      const matchedItems = matchItemsWithGroupRates(structuredItems, groupRates);
      result.items = matchedItems;
      
      // Extract additional terms
      const additionalTerms = extractAdditionalTerms(cleanedPrompt);
      result.customer = additionalTerms.customer;
      result.transport = additionalTerms.transport;
      result.loading = additionalTerms.loading;
      result.paymentTerms = additionalTerms.paymentTerms;
      
    } else {
      // Fallback to original parsing method
      result.isStructured = false;
      
      // Extract customer name using original patterns
      const customerMatch = cleanedPrompt.match(/To\s+([^,\n]+),/i);
      if (customerMatch) {
        result.customer = customerMatch[1].trim();
      } else {
        const altCustomerMatch = cleanedPrompt.match(/customer[:\s]+([^\n,]+)/i) ||
                                cleanedPrompt.match(/for\s+([^,\n]+)/i) ||
                                cleanedPrompt.match(/dear\s+([^,\n]+)/i);
        if (altCustomerMatch) {
          result.customer = altCustomerMatch[1].trim();
        }
      }

      // Extract transport and loading information
      const transportMatch = cleanedPrompt.match(/transport\s+([^,\n\.]+)/i);
      if (transportMatch) {
        result.transport = transportMatch[1].trim();
      }

      const loadingMatch = cleanedPrompt.match(/loading\s+([^,\n\.]+)/i);
      if (loadingMatch) {
        result.loading = loadingMatch[1].trim();
      }

      // Use original parsing methods
      const itemsWithQty = extractItemsWithQuantities(cleanedPrompt);
      const ratesData = extractRates(cleanedPrompt);
      const matchedItems = matchItemsWithRates(itemsWithQty, ratesData);
      
      result.items = matchedItems;
    }

    // If no items found, log for debugging
    if (result.items.length === 0) {
      console.log('No items found with enhanced parsing, raw prompt:', userPrompt);
      result.errors.push('No items could be parsed from the prompt');
    }

  } catch (error) {
    result.errors.push(`Parsing error: ${error.message}`);
  }

  return result;
}

/**
 * Extract items with quantities from the prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of items with descriptions and quantities
 */
function extractItemsWithQuantities(prompt) {
  const items = [];
  
  // Pattern to match: "ITEM_NAME - QUANTITY Nos"
  const itemQtyPatterns = [
    // Pattern 1: "ITEM_NAME - QTY Nos"
    /([A-Z][A-Z\s\d\.\-x]+?)\s*-\s*(\d+)\s*Nos?\.?\s*[,\.]?\s*/gi,
    
    // Pattern 2: "QTY Nos ITEM_NAME"
    /(\d+)\s*Nos?\s+([A-Z][A-Z\s\d\.\-x]+?)(?:\s*[-,\.]|$)/gi,
    
    // Pattern 3: "ITEM_NAME: QTY Nos"
    /([A-Z][A-Z\s\d\.\-x]+?)\s*:\s*(\d+)\s*Nos?\.?\s*[,\.]?\s*/gi
  ];

  for (const pattern of itemQtyPatterns) {
    const matches = [...prompt.matchAll(pattern)];
    
    for (const match of matches) {
      let description, quantity;
      
      if (match[0].match(/^\d+\s*Nos?/)) {
        // Pattern 2: QTY Nos ITEM_NAME
        quantity = parseInt(match[1]);
        description = match[2].trim();
      } else {
        // Other patterns: ITEM_NAME ... QTY
        description = match[1].trim();
        quantity = parseInt(match[2]);
      }

      // Clean up description
      description = description
        .replace(/\s+/g, ' ')
        .replace(/[-:,\.]+$/, '')
        .trim();

      if (description && !isNaN(quantity) && quantity > 0) {
        // Check if this item is already added
        const existingItem = items.find(item => 
          item.description.toLowerCase() === description.toLowerCase()
        );
        
        if (!existingItem) {
          items.push({
            description,
            quantity,
            uom: 'Nos'
          });
        }
      }
    }
    
    // If we found items with this pattern, break
    if (items.length > 0) break;
  }

  return items;
}

/**
 * Extract rates from the prompt
 * @param {string} prompt - User prompt
 * @returns {Array} Array of rate information
 */
function extractRates(prompt) {
  const rates = [];
  
  // Pattern to match rates: "ITEM @ RATE+GST PER KGS" or "ITEM - Rs.RATE+GST PER KGS"
  const ratePatterns = [
    // Pattern 1: "ITEM @ RATE+GST PER KGS"
    /([A-Z][A-Z\s\d\.\-x]*?)\s*@\s*(?:Rs\.?\s*)?(\d+(?:\.\d+)?)\s*\+?\s*GST\s*(?:per\s*kg[s]?)?\.?\s*/gi,
    
    // Pattern 2: "ITEM - Rs.RATE+GST PER KGS"
    /([A-Z][A-Z\s\d\.\-x]*?)\s*-\s*Rs\.?\s*(\d+(?:\.\d+)?)\s*\+?\s*GST\s*(?:per\s*kg[s]?)?\.?\s*/gi,
    
    // Pattern 3: "RATE+GST for ITEM"
    /(?:Rs\.?\s*)?(\d+(?:\.\d+)?)\s*\+?\s*GST\s*(?:for|per)?\s*([A-Z][A-Z\s\d\.\-x]*?)(?:\s*per\s*kg[s]?)?\.?\s*/gi
  ];

  for (const pattern of ratePatterns) {
    const matches = [...prompt.matchAll(pattern)];
    
    for (const match of matches) {
      let itemKey, rate;
      
      if (pattern.source.includes('for|per')) {
        // Pattern 3: RATE for ITEM
        rate = parseFloat(match[1]);
        itemKey = match[2].trim();
      } else {
        // Other patterns: ITEM @ RATE or ITEM - RATE
        itemKey = match[1].trim();
        rate = parseFloat(match[2]);
      }

      // Clean up item key
      itemKey = itemKey
        .replace(/\s+/g, ' ')
        .replace(/[-:@,\.]+$/, '')
        .trim();

      if (itemKey && !isNaN(rate) && rate > 0) {
        rates.push({
          itemKey,
          rate,
          rateUom: 'per kg'
        });
      }
    }
  }

  return rates;
}

/**
 * Match items with their corresponding rates and calculate weights
 * @param {Array} items - Items with quantities
 * @param {Array} rates - Rate information
 * @returns {Array} Matched items with rates and calculated weights
 */
function matchItemsWithRates(items, rates) {
  const matchedItems = [];

  for (const item of items) {
    let matchedRate = null;
    let bestScore = 0;

    // Try to find exact or partial match
    for (const rateData of rates) {
      const score = calculateMatchScore(item.description, rateData.itemKey);
      if (score > bestScore && score > 0.3) { // Minimum 30% match
        bestScore = score;
        matchedRate = rateData;
      }
    }

    // Calculate actual weight using section weights
    const actualWeight = calculateWeight(item.description, item.quantity, 6); // Default 6m length
    const weightInfo = getWeightInfo(item.description, 6);
    
    // If no exact match found, try similar items
    let finalDescription = item.description;
    let finalWeight = actualWeight;
    let warnings = [];
    
    if (actualWeight === 0) {
      // Try to find similar items
      const similarItems = findSimilarItems(item.description);
      if (similarItems.length > 0) {
        // Use the first similar item for weight calculation
        const bestMatch = similarItems[0];
        finalWeight = calculateWeight(bestMatch, item.quantity, 6);
        warnings.push(`Using similar item "${bestMatch}" for weight calculation`);
        
        // Keep original description but note the substitution
        finalDescription = item.description;
      } else {
        warnings.push(`No weight data found for "${item.description}"`);
      }
    }

    // Calculate amount if rate is available
    const rate = matchedRate ? matchedRate.rate : null;
    const amount = rate && finalWeight ? finalWeight * rate : 0;

    matchedItems.push({
      description: finalDescription,
      quantity: item.quantity,
      uom: item.uom,
      actualWeight: parseFloat(finalWeight.toFixed(2)), // Calculated weight in kg
      weightInfo: weightInfo,
      rate: rate,
      rateUom: matchedRate ? matchedRate.rateUom : 'per kg',
      amount: parseFloat(amount.toFixed(2)),
      matchScore: bestScore,
      warnings: warnings
    });
  }

  return matchedItems;
}

/**
 * Calculate match score between item description and rate key
 * @param {string} description - Item description
 * @param {string} rateKey - Rate key
 * @returns {number} Match score between 0 and 1
 */
function calculateMatchScore(description, rateKey) {
  const desc = description.toLowerCase();
  const key = rateKey.toLowerCase();

  // Exact match
  if (desc === key) return 1.0;

  // Check if key is contained in description or vice versa
  if (desc.includes(key) || key.includes(desc)) {
    return 0.8;
  }

  // Special handling for sheets - extract thickness
  const descThickness = extractThickness(desc);
  const keyThickness = extractThickness(key);
  
  if (descThickness && keyThickness && descThickness === keyThickness) {
    // If both have same thickness, likely a match
    if ((desc.includes('sheet') && key.includes('sheet')) ||
        (desc.includes('hr') && key.includes('sheet')) ||
        (desc.includes('cr') && key.includes('sheet'))) {
      return 0.9;
    }
  }

  // Check for steel type matches
  const steelTypes = ['ismb', 'rsj', 'ismc', 'isa', 'pipe', 'tube', 'flat', 'round', 'square'];
  for (const type of steelTypes) {
    if (desc.includes(type) && key.includes(type)) {
      return 0.7;
    }
  }

  // Check for partial word matches
  const descWords = desc.split(/\s+/);
  const keyWords = key.split(/\s+/);
  
  let matchingWords = 0;
  let totalWords = 0;
  
  for (const descWord of descWords) {
    totalWords++;
    for (const keyWord of keyWords) {
      if (descWord === keyWord || 
          descWord.includes(keyWord) || 
          keyWord.includes(descWord) ||
          (descWord.length > 2 && keyWord.length > 2 && 
           (descWord.includes(keyWord.substring(0, 3)) || keyWord.includes(descWord.substring(0, 3))))) {
        matchingWords++;
        break;
      }
    }
  }

  const matchRatio = matchingWords / totalWords;
  
  // Boost score if we have good partial matches
  if (matchRatio > 0.5) {
    return Math.min(0.8, matchRatio * 1.2);
  }

  return matchRatio;
}

/**
 * Extract thickness from description (for sheets)
 * @param {string} text - Text to extract thickness from
 * @returns {string|null} Thickness value or null
 */
function extractThickness(text) {
  // Look for patterns like "1.6mm", "2.0mm", "1.6", etc.
  const thicknessMatch = text.match(/(\d+(?:\.\d+)?)\s*mm/);
  if (thicknessMatch) {
    return thicknessMatch[1];
  }
  
  // Look for standalone decimal numbers that might be thickness
  const decimalMatch = text.match(/\b(\d+\.\d+)\b/);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);
    // Reasonable thickness range for steel sheets
    if (value >= 0.5 && value <= 50) {
      return decimalMatch[1];
    }
  }
  
  return null;
}

/**
 * Fallback AI parsing using structured approach
 * @param {string} userPrompt - The input prompt
 * @returns {Promise<object>} Parsed data using AI
 */
export async function parsePromptWithAI(userPrompt) {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert at parsing steel industry quotations. Extract the following information from steel quotation prompts and return ONLY a valid JSON object:

{
  "customer": "customer name",
  "items": [
    {
      "description": "steel item description",
      "quantity": number,
      "uom": "Nos",
      "rate": number,
      "rateUom": "per kg"
    }
  ],
  "transport": "transport info",
  "loading": "loading info",
  "gst": 18
}

Rules:
- Extract customer name from "To [CUSTOMER]," patterns
- Match steel items with their quantities and rates
- If rate is not specified for an item, set rate to null
- Default GST is 18% unless specified otherwise
- Extract transport and loading information if mentioned`
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      const parsedData = JSON.parse(aiResponse);
      
      // Convert to our expected format
      return {
        customer: parsedData.customer,
        items: parsedData.items || [],
        errors: [],
        transport: parsedData.transport,
        loading: parsedData.loading,
        gst: parsedData.gst || 18,
        aiParsed: true
      };
    } catch (jsonError) {
      throw new Error(`AI returned invalid JSON: ${aiResponse}`);
    }

  } catch (error) {
    console.error('AI parsing failed:', error);
    return {
      customer: null,
      items: [],
      errors: [`AI parsing failed: ${error.message}`],
      aiParsed: false
    };
  }
}

/**
 * Enhanced parsePrompt with AI fallback
 * @param {string} userPrompt - The input prompt
 * @param {boolean} useAI - Whether to use AI fallback if regex fails
 * @returns {Promise<object>|object} Parsed data
 */
export async function parsePromptWithFallback(userPrompt, useAI = true) {
  // First try regex parsing
  const regexResult = parsePrompt(userPrompt);
  
  // If regex parsing found items and they have rates, return it
  const hasValidItems = regexResult.items.length > 0 && 
                       regexResult.items.some(item => item.rate !== null);
  
  if (hasValidItems) {
    return regexResult;
  }

  // If regex failed and AI is enabled, try AI parsing
  if (useAI && regexResult.items.length === 0) {
    console.log('Regex parsing failed, trying AI fallback...');
    const aiResult = await parsePromptWithAI(userPrompt);
    
    if (aiResult.items.length > 0) {
      return aiResult;
    }
  }

  // Return regex result even if incomplete
  return regexResult;
}

/**
 * Validate parsed prompt data
 * @param {object} parsedData - Result from parsePrompt
 * @returns {object} Validation result with success status and messages
 */
export function validateParsedData(parsedData) {
  const validation = {
    success: true,
    warnings: [],
    errors: []
  };

  // Check customer name
  if (!parsedData.customer) {
    validation.warnings.push('Customer name not found in prompt');
  }

  // Check items
  if (parsedData.items.length === 0) {
    validation.success = false;
    validation.errors.push('No items found in prompt');
  }

  // Validate each item
  parsedData.items.forEach((item, index) => {
    if (!item.description) {
      validation.errors.push(`Item ${index + 1}: Missing description`);
      validation.success = false;
    }
    
    if (!item.quantity || item.quantity <= 0) {
      validation.errors.push(`Item ${index + 1}: Invalid quantity`);
      validation.success = false;
    }
    
    if (!item.rate || item.rate <= 0) {
      validation.warnings.push(`Item ${index + 1}: No rate specified for ${item.description}`);
    }
  });

  // Add any parsing errors
  if (parsedData.errors && parsedData.errors.length > 0) {
    validation.warnings.push(...parsedData.errors);
  }

  return validation;
}

/**
 * Format parsed data for display
 * @param {object} parsedData - Result from parsePrompt
 * @returns {string} Formatted string representation
 */
export function formatParsedData(parsedData) {
  let output = '';
  
  if (parsedData.customer) {
    output += `Customer: ${parsedData.customer}\n\n`;
  }
  
  if (parsedData.items.length > 0) {
    output += 'Items:\n';
    parsedData.items.forEach((item, index) => {
      output += `${index + 1}. ${item.description}\n`;
      output += `   Quantity: ${item.quantity} ${item.uom || 'Nos'}\n`;
      if (item.rate) {
        output += `   Rate: Rs. ${item.rate} ${item.rateUom || 'per kg'}\n`;
      } else {
        output += `   Rate: Not specified\n`;
      }
      if (item.matchScore) {
        output += `   Match Score: ${(item.matchScore * 100).toFixed(1)}%\n`;
      }
      output += '\n';
    });
  }

  if (parsedData.transport) {
    output += `Transport: ${parsedData.transport}\n`;
  }

  if (parsedData.loading) {
    output += `Loading: ${parsedData.loading}\n`;
  }

  if (parsedData.aiParsed) {
    output += '\n(Parsed using AI fallback)\n';
  }
  
  if (parsedData.errors && parsedData.errors.length > 0) {
    output += '\nParsing Errors:\n';
    parsedData.errors.forEach(error => {
      output += `- ${error}\n`;
    });
  }
  
  return output;
}

export default parsePrompt; 