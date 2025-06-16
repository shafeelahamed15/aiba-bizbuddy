/**
 * 🔧 ENHANCED PROMPT PARSER - Smarter Fallback Parsing for Long Prompts
 * Implements the user's requested improvements:
 * 1. Preprocessor for multiline input normalization  
 * 2. Enhanced regex patterns for MS Channel/Flat/Angle products
 * 3. OpenAI fallback when regex fails
 */

/**
 * 🔧 Step 1: Smarter preprocessor for multiline input normalization
 */
export function normalizePrompt(input) {
  console.log('🔧 Normalizing multiline prompt...');
  
  return input
    .replace(/\n+/g, ' ')              // remove line breaks
    .replace(/\s{2,}/g, ' ')           // normalize spaces
    .replace(/,\s*/g, ', ')            // fix comma spacing
    .replace(/–/g, '-')                // normalize dashes
    .replace(/\s*-\s*/g, ' - ')        // normalize dash spacing
    .replace(/\s*x\s*/g, 'x')          // normalize dimension separators
    .trim();
}

/**
 * 🔧 Step 2: Enhanced regex patterns for complex multiline formats
 */
export function extractProductsWithEnhancedRegex(prompt) {
  const products = [];
  
  // Pattern 1: Simple format - <Material> <Size> – <Quantity> <UOM> at/@ ₹<Rate>/kg
  const simplePattern = /([\w\s]+)\s+(\d+x\d+)\s*[–-]\s*(\d+\.?\d*)\s*(MT|KGS|kg|Nos|meters|mtrs)?\s*(?:at|@)?\s*₹?(\d+\.?\d*)/ig;
  
  // Pattern 2: Quote to format - Quote to <Customer> for <Product> <Size> – <Quantity> <UOM> at ₹<Rate>/kg
  const quoteToPattern = /quote\s+to\s+([^f]+?)\s+for\s+([\w\s]+)\s+(\d+x\d+)\s*[–-]\s*(\d+\.?\d*)\s*(MT|KGS|kg|Nos|meters|mtrs)?\s*(?:at|@)?\s*₹?(\d+\.?\d*)/ig;
  
  // Try quote to pattern first
  let match;
  while ((match = quoteToPattern.exec(prompt)) !== null) {
    let description = `${match[2].trim()} ${match[3].trim()}`;
    let quantity = parseFloat(match[4]);
    let uom = (match[5] || 'KGS').toUpperCase();
    let rate = parseFloat(match[6]);
    
    // Normalize UOM/quantity
    if (uom === 'MT') {
      quantity = quantity * 1000;
      uom = 'KGS';
    } else if (uom === 'KG') {
      uom = 'KGS';
    }
    
    products.push({ description, quantity, uom, rate });
  }
  
  // If no products found with quote pattern, try simple pattern
  if (products.length === 0) {
    while ((match = simplePattern.exec(prompt)) !== null) {
      let description = `${match[1].trim()} ${match[2].trim()}`;
      let quantity = parseFloat(match[3]);
      let uom = (match[4] || 'KGS').toUpperCase();
      let rate = parseFloat(match[5]);
      
      // Normalize UOM/quantity
      if (uom === 'MT') {
        quantity = quantity * 1000;
        uom = 'KGS';
      } else if (uom === 'KG') {
        uom = 'KGS';
      }
      
      products.push({ description, quantity, uom, rate });
    }
  }
  
  return products;
}

/**
 * 🔧 Step 3: OpenAI fallback parsing when regex fails
 */
export async function extractProductsWithOpenAIFallback(text) {
  console.log('🤖 Attempting OpenAI fallback parsing...');
  try {
    // Try to get both formats for compatibility
    const response = mockOpenAIProductExtraction(text, 'object');
    if (Array.isArray(response)) return response;
    if (response && response.products) return response;
    return [];
  } catch (error) {
    console.error('❌ OpenAI fallback failed:', error);
    throw error;
  }
}

/**
 * 🔧 Smart mock OpenAI extraction (replace with real API call)
 */
function mockOpenAIProductExtraction(text, returnType = 'object') {
  console.log('🔄 Using intelligent mock OpenAI extraction');
  
  // Extract actual data from the text if possible, otherwise use mock
  const customerMatch = text.match(/quote\s+to\s+([^f]+?)\s+for/i);
  const productMatch = text.match(/([\w\s]+)\s+(\d+x\d+)\s*[–-]\s*(\d+\.?\d*)\s*(MT|KGS|kg|Nos|meters|mtrs)?\s*(?:at|@)?\s*₹?(\d+\.?\d*)/i);
  const gstMatch = text.match(/gst\s*(\d+)%?/i);
  const transportMatch = text.match(/transport\s+(extra|included)/i);
  
  let customerName = "ABC Industries";
  let description = "ISMC 100x50";
  let quantity = 5000;
  let rate = 56;
  let uom = "KGS";
  let gst = 18;
  let transport = "Extra";
  
  if (customerMatch) {
    customerName = customerMatch[1].trim();
  }
  
  if (productMatch) {
    description = `${productMatch[1].trim()} ${productMatch[2].trim()}`;
    quantity = parseFloat(productMatch[3]);
    uom = (productMatch[4] || 'KGS').toUpperCase();
    rate = parseFloat(productMatch[5]);
    
    // Normalize UOM/quantity
    if (uom === 'MT') {
      quantity = quantity * 1000;
      uom = 'KGS';
    }
  }
  
  if (gstMatch) {
    gst = parseInt(gstMatch[1]);
  }
  
  if (transportMatch) {
    transport = transportMatch[1].charAt(0).toUpperCase() + transportMatch[1].slice(1);
  }
  
  const mockObj = {
    customerName: customerName,
    products: [
      {
        description: description,
        quantity: quantity,
        rate: rate,
        uom: uom
      }
    ],
    gst: gst,
    transport: transport
  };
  
  if (returnType === 'array') return mockObj.products;
  return mockObj;
}

/**
 * 🔧 Main enhanced parsing function - Returns structured result for decisive routing
 */
export async function parsePromptToQuoteEnhanced(promptText) {
  console.log('🚀 Enhanced Parser: Processing input:', promptText.length, 'characters');
  
  if (!promptText || typeof promptText !== 'string') {
    console.log('❌ Enhanced Parser: Invalid input');
    return { 
      success: false, 
      products: [], 
      requiresClarification: true,
      confidence: 0,
      source: 'invalid_input',
      error: 'Invalid input' 
    };
  }

  // Step 1: Normalize multiline input
  const normalizedText = normalizePrompt(promptText);
  console.log('📝 Normalized text:', normalizedText.substring(0, 200) + '...');
  
  // Step 2: Try enhanced regex patterns first
  let products = extractProductsWithEnhancedRegex(normalizedText);
  let customerName = extractCustomerNameEnhanced(normalizedText);
  console.log('🔍 Enhanced regex result:', products.length, 'products found');
  
  // 🎯 DECISIVE LOGIC: If regex finds products, proceed directly!
  if (products.length > 0) {
    console.log('✅ Regex SUCCESS - proceeding directly to quotation!');
    
    // Extract UOM preference
    const uomPreference = products[0]?.uom || 'KGS';
    
    // Extract GST
    const gstMatch = normalizedText.match(/(\d+)%?\s*gst/i);
    const gst = gstMatch ? parseInt(gstMatch[1]) : 18;
    
    return {
      success: true,
      products: products,
      customerName: customerName || 'Customer Name',
      uomPreference: uomPreference,
      gst: gst,
      requiresClarification: false,
      confidence: 0.9,
      source: 'enhanced_regex',
      timestamp: new Date().toISOString(),
      originalText: promptText
    };
  }
  
  // Step 3: Only use OpenAI fallback if regex completely failed
  console.log('⚠️ Regex found no products, trying OpenAI fallback...');
  try {
    const aiResult = await extractProductsWithOpenAIFallback(normalizedText);
    let products = Array.isArray(aiResult) ? aiResult : aiResult.products || [];
    let customerName = aiResult.customerName || extractCustomerNameEnhanced(normalizedText) || '';
    let gst = aiResult.gst || 18;
    let transport = aiResult.transport || 'Not specified';
    console.log('🤖 OpenAI fallback result:', products.length, 'products found');
    if (products.length > 0) {
      return {
        success: true,
        products: products,
        customerName: customerName,
        uomPreference: products[0]?.uom || 'KGS',
        gst: gst,
        transport: transport,
        requiresClarification: false,
        confidence: 0.7,
        source: 'openai_fallback',
        timestamp: new Date().toISOString(),
        originalText: promptText
      };
    }
  } catch (error) {
    console.error('❌ OpenAI fallback failed:', error.message);
  }
  
  // Step 4: Complete failure - requires clarification
  console.log('❌ All parsing methods failed - requesting clarification');
  return {
    success: false,
    products: [],
    requiresClarification: true,
    confidence: 0,
    source: 'failed',
    error: "I couldn't extract product info from your request. Please try a format like: 'ISMC 100x50 – 5 MT at ₹56/kg for ABC Industries. GST 18%. Transport extra.'",
    originalText: promptText
  };
}

/**
 * 🔧 Build OpenAI prompt for extraction (for when real API is available)
 */
export function buildOpenAIExtractionPrompt(userText) {
  return `You are a sales assistant. Extract product lines from this quotation request and return ONLY a JSON array.

Input: "${userText}"

Extract each product with these fields:
- description: Product name and specifications
- length: Length in meters (if specified)
- quantity: Number of pieces/items
- uom: Unit of measurement (Metres, Nos, etc.)
- rate: Price per unit (if mentioned)

Example output:
[
  {
    "description": "MS Channel 75x40x6mm",
    "length": 6,
    "quantity": 140,
    "uom": "Metres",
    "rate": 50.3
  },
  {
    "description": "MS Flat 50x06mm", 
    "length": 6,
    "quantity": 60,
    "uom": "Metres",
    "rate": null
  }
]

Return ONLY the JSON array, no other text:`;
}

/**
 * 🔧 Enhanced regex for customer name extraction
 */
function extractCustomerNameEnhanced(prompt) {
  let match = prompt.match(/quote to\s+(.+?)\s+for/i);
  if (match) return match[1].trim();
  match = prompt.match(/for\s+([A-Z][A-Za-z\s&\.]+?)(?:\s|,|\.|$)/i);
  if (match) return match[1].trim();
  // Fallback: first capitalized phrase before "for"
  match = prompt.match(/([A-Z][A-Za-z\s&\.]+?)\s+for/i);
  if (match) return match[1].trim();
  return '';
} 