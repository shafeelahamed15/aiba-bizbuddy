/**
 * ROBUST UNSTRUCTURED QUOTATION PARSER
 * 3-Layer Logic:
 * 1. Prompt Type Classifier
 * 2. Product Line Extractor (Robust Text Parsing)
 * 3. Section Weight + Rate Inference
 */

import { sectionWeights } from '../data/sectionWeights.js';

// LAYER 1: PROMPT TYPE CLASSIFIER
export function classifyPromptType(prompt) {
  const normalizedPrompt = prompt.toLowerCase().trim();
  
  // Quotation indicators
  const quotationKeywords = [
    "create quote", "quote to", "quotation for", "quotation to", 
    "give quote", "provide quote", "need quote", "uom to be in"
  ];
  
  // Purchase Order indicators
  const poKeywords = [
    "purchase order", "po to", "po for", "create po", "generate po"
  ];
  
  // Product query indicators
  const queryKeywords = [
    "what is", "tell me about", "difference between", "properties of", "specification"
  ];
  
  if (quotationKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
    return "quotation";
  }
  
  if (poKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
    return "purchase_order";
  }
  
  if (queryKeywords.some(keyword => normalizedPrompt.includes(keyword))) {
    return "product_query";
  }
  
  // Check if it contains product specifications (likely quotation)
  const hasProductSpecs = /[A-Za-z\s]+(channel|flat|angle|pipe|beam|sheet|tmt|hr|cr)\s*\d+\s*x?\s*\d*/i.test(normalizedPrompt);
  const hasQuantity = /\d+\s*(nos|mt|mtrs|kgs|pieces)/i.test(normalizedPrompt);
  
  if (hasProductSpecs && hasQuantity) {
    return "quotation";
  }
  
  return "chat";
}

// LAYER 2: ROBUST PRODUCT LINE EXTRACTOR
export function extractItems(promptText) {
  console.log("🔍 Extracting items from:", promptText);
  
  const items = [];
  
  // 🔥 ENHANCED PATTERN - Multi-line tolerant regex for the exact format you specified
  // Handles: "MS Channel 75 x40 x6mm – 6 MTR Length, 140 Nos"
  const primaryPattern = /([A-Za-z0-9 xX\-]+(?:channel|flat|angle|pipe|beam|sheet|tmt|hr|cr)[A-Za-z0-9 xX\-]*)\s*[-–]\s*(\d+(?:\.\d+)?)\s*MTR.*?(\d+)\s*Nos/gi;
  
  // Pattern 1: Standard format with flexible spacing
  const pattern1 = /(MS\s+(?:Channel|Flat|Angle|Pipe|Beam|Sheet|TMT|HR|CR)\s+\d+\s*[xX]?\s*\d+(?:\s*[xX]?\s*\d+)?(?:\s*mm)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*MTR?(?:\s*\(?Length\)?)?[,\s]*(\d+)\s*Nos/gi;
  
  // Pattern 2: Handle extra spaces in dimensions "75 x40 x6mm"
  const pattern2 = /(MS\s+(?:Channel|Flat|Angle|Pipe|Beam|Sheet|TMT|HR|CR)\s+\d+\s+[xX]\s*\d+(?:\s+[xX]\s*\d+)?(?:\s*mm)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*MTR?(?:\s*Length)?[,\s]*(\d+)\s*Nos/gi;
  
  // Pattern 3: Handle "50 x 06 mm" format with zero-padded numbers
  const pattern3 = /(MS\s+(?:Channel|Flat|Angle|Pipe|Beam|Sheet|TMT|HR|CR)\s+\d+\s*[xX]\s*0?\d+(?:\s*[xX]\s*0?\d+)?(?:\s*mm)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*MTR?(?:\s*Length)?[,\s]*(\d+)\s*Nos/gi;
  
  // Pattern 4: Compact format "MS Channel 75x40x6mm – 6 MTR (Length) – 140 Nos"
  const pattern4 = /(MS\s+(?:Channel|Flat|Angle|Pipe|Beam|Sheet|TMT|HR|CR)\s*\d+[xX]\d+(?:[xX]\d+)?(?:mm)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*MTR?\s*\(?Length?\)?\s*[-–,]\s*(\d+)\s*Nos/gi;
  
  // Pattern 5: Line break tolerant - handles newlines between components
  const pattern5 = /(MS\s+(?:Channel|Flat|Angle|Pipe|Beam|Sheet|TMT|HR|CR)[^\n\r]*\d+[^\n\r]*)\s*[-–]?\s*(\d+(?:\.\d+)?)\s*MTR?(?:\s*Length)?\s*[,\n\r]*\s*(\d+)\s*Nos/gi;
  
  const patterns = [primaryPattern, pattern1, pattern2, pattern3, pattern4, pattern5];
  
  patterns.forEach((pattern, index) => {
    // Reset regex lastIndex to avoid issues with global flag
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(promptText)) !== null) {
      let description = match[1].trim().replace(/\s+/g, ' ');
      const length = parseFloat(match[2]) || 6;
      const nos = parseInt(match[3]);
      
      // Clean up description - normalize spacing
      description = description
        .replace(/\s*[xX]\s*/g, 'x') // Normalize x separators
        .replace(/\s+/g, ' ') // Single spaces
        .trim();
      
      // Avoid duplicates - more robust duplicate detection
      const normalizedDesc = description.toLowerCase().replace(/[^\w]/g, '');
      const isDuplicate = items.some(item => {
        const existingDesc = item.description.toLowerCase().replace(/[^\w]/g, '');
        return existingDesc === normalizedDesc && item.nos === nos;
      });
      
      if (!isDuplicate && nos > 0 && description.length > 5) {
        items.push({
          description: description,
          length: length,
          nos: nos,
          uom: 'Metres',
          originalUOM: 'Nos',
          patternUsed: index + 1
        });
        console.log(`✅ Extracted item using pattern ${index + 1}:`, { description, length, nos });
      }
    }
  });
  
  // 🔧 FALLBACK: If no items found, try a more lenient approach
  if (items.length === 0) {
    console.log("⚠️ Primary patterns failed, trying fallback extraction...");
    
    // Super flexible fallback pattern
    const fallbackPattern = /([A-Za-z\s]+\d+[^0-9\n\r]*\d+[^0-9\n\r]*(?:\d+)?[^0-9\n\r]*)\s*(?:[-–]|\s)\s*(\d+(?:\.\d+)?)\s*(?:MTR|mtr|Mtr)(?:[^0-9]*(\d+)\s*(?:Nos|nos|NOS))?/gi;
    
    let match;
    while ((match = fallbackPattern.exec(promptText)) !== null) {
      let description = match[1].trim().replace(/\s+/g, ' ');
      const length = parseFloat(match[2]) || 6;
      const nos = match[3] ? parseInt(match[3]) : 1;
      
      if (description.length > 5 && nos > 0) {
        items.push({
          description: description,
          length: length,
          nos: nos,
          uom: 'Metres',
          originalUOM: 'Nos',
          patternUsed: 'fallback'
        });
        console.log(`✅ Extracted item using fallback pattern:`, { description, length, nos });
      }
    }
  }
  
  return items;
}

// LAYER 3: SECTION WEIGHT + RATE INFERENCE
export function calculateAmountFromMtrs(description, length, nos, ratePerKg = null, ratePerMtr = null) {
  const normalizedDesc = normalizeDescriptionForWeight(description);
  const sectionWeight = getWeightPerMeter(normalizedDesc);
  
  console.log(`🔢 Calculating for: ${description}`);
  console.log(`📐 Section weight: ${sectionWeight} kg/mtr`);
  
  const totalMtrs = length * nos;
  const totalWeight = sectionWeight * totalMtrs;
  
  let finalRatePerMtr;
  let finalRatePerKg;
  
  if (ratePerMtr) {
    // Direct rate per meter provided
    finalRatePerMtr = ratePerMtr;
    finalRatePerKg = ratePerMtr / sectionWeight;
  } else if (ratePerKg) {
    // Rate per kg provided, calculate rate per meter
    finalRatePerKg = ratePerKg;
    finalRatePerMtr = sectionWeight * ratePerKg;
  } else {
    // No rate provided, use default estimation
    finalRatePerKg = 60; // Default rate per kg
    finalRatePerMtr = sectionWeight * finalRatePerKg;
  }
  
  const amount = totalMtrs * finalRatePerMtr;
  
  return {
    totalMtrs: totalMtrs,
    totalWeight: totalWeight,
    ratePerMtr: finalRatePerMtr,
    ratePerKg: finalRatePerKg,
    amount: amount,
    sectionWeight: sectionWeight
  };
}

// EXTRACT RATES FROM PROMPT
export function extractRatesFromPrompt(prompt) {
  const rates = {};
  
  // Pattern for rates: "MS Channel – 50.3 ₹/kg"
  const ratePattern = /([A-Za-z\s]+(?:channel|flat|angle|pipe|beam|sheet|tmt|hr|cr)[A-Za-z\s]*(?:\d+\s*x?\s*\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*₹?\/?(kg|mtr)/gi;
  
  let match;
  while ((match = ratePattern.exec(prompt)) !== null) {
    const productType = match[1].trim().toLowerCase();
    const rate = parseFloat(match[2]);
    const unit = match[3].toLowerCase();
    
    rates[productType] = {
      rate: rate,
      unit: unit
    };
    
    console.log(`💰 Extracted rate: ${productType} = ₹${rate}/${unit}`);
  }
  
  return rates;
}

// MAIN PARSER FUNCTION WITH 3-LAYER LOGIC
export function parseUnstructuredQuotation(prompt) {
  console.log("🚀 ENHANCED PARSER - Starting robust 3-layer parsing...");
  console.log("📝 Input length:", prompt.length);
  console.log("📄 Full input:");
  console.log("=".repeat(50));
  console.log(prompt);
  console.log("=".repeat(50));
  
  // LAYER 1: Classify prompt type
  const promptType = classifyPromptType(prompt);
  console.log(`📋 Prompt classified as: ${promptType}`);
  
  if (promptType !== "quotation") {
    console.log("❌ Not classified as quotation, throwing error");
    throw new Error(`This appears to be a ${promptType} request, not a quotation`);
  }
  
  const quotation = {
    customer: "",
    location: "",
    uom: "kg",
    transport: "Not specified",
    loadingCharges: "Not specified",
    paymentTerms: "Not specified",
    products: [],
    gst: 18,
    subtotal: 0,
    total: 0
  };
  
  // Extract customer info (more robust patterns)
  const customerPatterns = [
    /(?:create\s+quote\s+to|quote\s+to|quotation\s+to|quotation\s+for)\s+([A-Z\s&.,\-()]+?)\s*,\s*([A-Z\s&.,\-()]+?)(?:\.|,|\s+UOM|\s+Transport|\n)/i,
    /(?:create\s+quote\s+to|quote\s+to)\s+([A-Z\s&.,\-()]+?)(?:\s*,\s*([A-Z\s&.,\-()]+?))?(?:\.|UOM|Transport|\n)/i
  ];
  
  for (const pattern of customerPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      quotation.customer = match[1].trim();
      if (match[2]) {
        quotation.location = match[2].trim();
      }
      break;
    }
  }
  
  // Extract UOM preference
  const uomKeywords = ["uom to be in mtrs", "uom to be in meters", "uom in mtrs", "quote in meters"];
  if (uomKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
    quotation.uom = "Metres";
  }
  
  // Extract transport/loading/payment terms
  if (prompt.toLowerCase().includes("transport included")) {
    quotation.transport = "Included";
  }
  if (prompt.toLowerCase().includes("loading charges included") || prompt.toLowerCase().includes("loading included")) {
    quotation.loadingCharges = "Included";
  }
  
  // Extract GST
  const gstMatch = prompt.match(/add\s+(\d+)%\s*gst|(\d+)%\s*gst/i);
  if (gstMatch) {
    quotation.gst = parseInt(gstMatch[1] || gstMatch[2]);
  }
  
  // LAYER 2: Extract items using robust patterns
  console.log("🔍 Starting item extraction with enhanced patterns...");
  const rawItems = extractItems(prompt);
  console.log(`📦 Extracted ${rawItems.length} items`);
  if (rawItems.length === 0) {
    console.log("❌ No items extracted - check patterns");
  } else {
    console.log("✅ Items found:", rawItems);
  }
  
  // LAYER 3: Extract rates and calculate amounts
  const extractedRates = extractRatesFromPrompt(prompt);
  
  rawItems.forEach(rawItem => {
    // Find matching rate for this item
    let matchingRate = null;
    const itemType = rawItem.description.toLowerCase();
    
    for (const [rateKey, rateData] of Object.entries(extractedRates)) {
      if (itemType.includes(rateKey.split(' ')[0]) && itemType.includes(rateKey.split(' ')[1])) {
        matchingRate = rateData;
        break;
      }
    }
    
    // Calculate amounts based on UOM
    let calculatedData;
    if (quotation.uom === "Metres") {
      const ratePerMtr = matchingRate?.unit === 'mtr' ? matchingRate.rate : null;
      const ratePerKg = matchingRate?.unit === 'kg' ? matchingRate.rate : null;
      
      calculatedData = calculateAmountFromMtrs(
        rawItem.description, 
        rawItem.length, 
        rawItem.nos, 
        ratePerKg, 
        ratePerMtr
      );
      
      quotation.products.push({
        description: rawItem.description,
        length: rawItem.length,
        nos: rawItem.nos,
        total_mtrs: calculatedData.totalMtrs,
        rate_per_mtr: calculatedData.ratePerMtr,
        amount: calculatedData.amount,
        weight_per_mtr: calculatedData.sectionWeight
      });
    } else {
      // kg mode
      calculatedData = calculateAmountFromMtrs(
        rawItem.description, 
        rawItem.length, 
        rawItem.nos, 
        matchingRate?.rate || 60
      );
      
      quotation.products.push({
        description: rawItem.description,
        length: rawItem.length,
        nos: rawItem.nos,
        total_kg: calculatedData.totalWeight,
        rate_per_kg: calculatedData.ratePerKg,
        amount: calculatedData.amount,
        weight_per_mtr: calculatedData.sectionWeight
      });
    }
  });
  
  // Calculate totals
  quotation.subtotal = quotation.products.reduce((sum, item) => sum + item.amount, 0);
  quotation.total = quotation.subtotal * (1 + quotation.gst / 100);
  
  console.log(`✅ Parsing complete: ${quotation.products.length} items, subtotal: ₹${quotation.subtotal.toFixed(2)}`);
  
  return quotation;
}

// UTILITY FUNCTIONS
function normalizeDescriptionForWeight(description) {
  // Normalize spacing and case for weight lookup
  return description
    .toLowerCase()
    .replace(/\s+x\s+/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWeightPerMeter(description) {
  // Try exact match first
  if (sectionWeights[description]) {
    const weightData = sectionWeights[description];
    return typeof weightData === 'number' ? weightData : weightData.weight || 0;
  }
  
  // Try partial matches by removing size specifications
  const baseDesc = description.replace(/\d+x\d+(?:x\d+)?/, '').trim();
  for (const [key, value] of Object.entries(sectionWeights)) {
    if (key.toLowerCase().includes(baseDesc)) {
      return typeof value === 'number' ? value : value.weight || 0;
    }
  }
  
  // Extract product type and size for manual calculation
  const channelMatch = description.match(/channel.*?(\d+)x(\d+)x?(\d+)?/i);
  const flatMatch = description.match(/flat.*?(\d+)x(\d+)/i);
  const angleMatch = description.match(/angle.*?(\d+)x(\d+)x?(\d+)?/i);
  
  if (channelMatch) {
    const [, h, w, t] = channelMatch.map(x => parseFloat(x) || 6);
    return ((h + w) * t * 0.00785); // Approximate formula for channel
  }
  
  if (flatMatch) {
    const [, w, t] = flatMatch.map(x => parseFloat(x));
    return (w * t * 0.00785); // Approximate formula for flat
  }
  
  if (angleMatch) {
    const [, a, b, t] = angleMatch.map(x => parseFloat(x) || 6);
    return ((a + b) * t * 0.00785); // Approximate formula for angle
  }
  
  return 10; // Default fallback weight
}

// VALIDATION AND DISPLAY FUNCTIONS
export function validateQuotation(quotation) {
  const errors = [];
  const warnings = [];

  if (!quotation.customer) {
    errors.push("Customer name could not be extracted");
  }

  if (!quotation.products || quotation.products.length === 0) {
    errors.push("No items could be parsed from the input");
  }

  quotation.products.forEach((item, index) => {
    if (!item.description) {
      errors.push(`Item ${index + 1}: Description is missing`);
    }
    if (!item.nos || item.nos <= 0) {
      errors.push(`Item ${index + 1}: Invalid quantity`);
    }
    if (item.weight_per_mtr === 10) {
      warnings.push(`Item ${index + 1}: Using default weight for "${item.description}"`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

export function formatQuotationDisplay(quotation) {
  let display = `📋 **Quotation for ${quotation.customer}**`;
  
  if (quotation.location) {
    display += `, ${quotation.location}`;
  }
  
  display += `\n\n**🎯 UOM:** ${quotation.uom}\n`;
  display += `**🚚 Transport:** ${quotation.transport}\n`;
  display += `**📦 Loading:** ${quotation.loadingCharges}\n\n`;

  display += `**📋 Items:**\n`;
  
  const items = quotation.products || quotation.products || [];
  items.forEach((item, index) => {
    if (quotation.uom === "Metres") {
      display += `${index + 1}. ${item.description} – ${item.length} MTR (Length) – ${item.nos} Nos – ₹${item.rate_per_mtr.toFixed(2)}/mtr\n`;
      display += `   Total: ${item.total_mtrs} Mtrs × ₹${item.rate_per_mtr.toFixed(2)} = **₹${item.amount.toLocaleString('en-IN')}**\n\n`;
    } else {
      display += `${index + 1}. ${item.description} – ${item.length} MTR – ${item.nos} Nos – ₹${item.rate_per_kg.toFixed(2)}/kg\n`;
      display += `   Total: ${item.total_kg.toFixed(2)} kg × ₹${item.rate_per_kg.toFixed(2)} = **₹${item.amount.toLocaleString('en-IN')}**\n\n`;
    }
  });

  display += `**💰 Subtotal:** ₹${quotation.subtotal.toLocaleString('en-IN')}\n`;
  display += `**📊 GST (${quotation.gst}%):** ₹${(quotation.total - quotation.subtotal).toLocaleString('en-IN')}\n`;
  display += `**🎯 Total:** ₹${quotation.total.toLocaleString('en-IN')}`;

  return display;
}

/**
 * Generate sample prompt for testing
 */
export function generateSamplePrompt() {
  return `Create quote to SRI ENERGY, VIRALIMALAI. UOM to be in Mtrs. Transport Included Loading Charges included. MS Channel 75 x40 x6mm - 6 MTR Length, 140 Nos. MS Flat 75 x 10mm - 6 MTR, 10 Nos. MS Angle 40x40x6mm - 6 MTR, 35 Nos. MS Flat 50 x 06 mm - 6 MTR, 300 Nos. Add 18% GST`;
}

export default {
  parseUnstructuredQuotation,
  validateQuotation,
  formatQuotationDisplay,
  generateSamplePrompt
}; 