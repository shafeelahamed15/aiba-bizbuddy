// Training data will be loaded dynamically to avoid import issues

/**
 * Advanced Prompt Parser for Quotation Data Extraction
 * Extracts customer name, items, GST, transport, loading charges, payment terms from natural language input
 */
class PromptParser {
  constructor() {
    this.trainingData = [];
    this.patterns = this.initializePatterns();
    this.confidence = 0;
    this.loadTrainingData();
  }

  /**
   * Load training data dynamically
   */
  async loadTrainingData() {
    try {
      const response = await fetch('./training-data/samples.json');
      if (response.ok) {
        this.trainingData = await response.json();
      }
    } catch (error) {
      console.log('Training data not available, using defaults');
      this.trainingData = [];
    }
  }

  /**
   * Initialize regex patterns for various field extractions
   */
  initializePatterns() {
    return {
      // ✅ UPGRADED: Customer name patterns - prioritize keywords 'for', 'to', 'customer:'
      customer: [
        // High priority: explicit keywords at the end
        /(?:for|to)\s+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i,
        /customer[:\s]+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i,
        /quote\s+(?:for|to)\s+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i,
        /quotation\s+(?:for|to)\s+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i,
        // Medium priority: structured formats
        /(?:company|firm|customer)[:\s]+([^@\d\n]{3,50})/i,
        // Lower priority: avoid product-like patterns (containing numbers, @, MT, Nos, etc.)
        /^(?!.*\d+(?:MT|Nos|Kg|@|₹))([^:@\n]{3,50}?)(?:\s*[:\n])/i
      ],

      // ✅ UPGRADED: Product patterns - better capture of "5MT TMT bars @ Rs.58" format
      products: [
        // Priority 1: "5MT TMT bars @ Rs.58" format
        /(\d+(?:\.\d+)?)\s*(MT|Nos|Kg|pcs|pieces?|ton|tonnes?)\s+([^@\n]+?)\s*@\s*(?:Rs\.?|₹)\s*(\d+(?:\.\d+)?)/gi,
        // Priority 2: "TMT bars 5MT @ 58" format  
        /([A-Za-z][^@\n\d]{2,40}?)\s+(\d+(?:\.\d+)?)\s*(MT|Nos|Kg|pcs|pieces?|ton|tonnes?)\s*@\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d+)?)/gi,
        // Priority 3: "TMT bars - 5MT @ ₹58" format
        /([A-Za-z][^-@\n]{2,50}?)\s*-\s*(\d+(?:\.\d+)?)\s*(MT|Nos|Kg|pcs|pieces?|ton|tonnes?)\s*@\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d+)?)/gi,
        // Priority 4: Flexible format with rate unit
        /([A-Za-z][^@\n]{2,50}?)\s*(?:-|:)?\s*(\d+(?:\.\d+)?)\s*(MT|Nos|Kg|pcs|pieces?|ton|tonnes?)\s*@\s*(?:Rs\.?|₹)?\s*(\d+(?:\.\d+)?)(?:\/([A-Za-z]+))?/gi
      ],

      // GST patterns
      gst: [
        /gst[\s:]*(\d+(?:\.\d+)?)%?/i,
        /(\d+(?:\.\d+)?)%?\s*gst/i,
        /\+\s*gst\s*(\d+(?:\.\d+)?)%?/i,
        /gst[\s@]*(\d+(?:\.\d+)?)%?/i
      ],

      // Transport patterns
      transport: [
        /transport[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /freight[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /delivery[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i
      ],

      // Loading charges patterns
      loading: [
        /loading[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /loading\s+charges?[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /loading[\s:]*₹?(\d+(?:\.\d+)?)(?:\/([A-Za-z]+))?/i
      ],

      // Payment terms patterns
      payment: [
        /payment[\s:]*terms?[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /payment[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /terms?[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i
      ],

      // Price validity patterns
      validity: [
        /validity[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /valid[\s:]*for[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i,
        /quote[\s:]*valid[\s:]*([^.\n,]+?)(?:[.\n,]|$)/i
      ],

      // Currency patterns
      currency: /₹?(\d+(?:,\d{3})*(?:\.\d{2})?)/g,

      // Unit of measurement patterns
      uom: /(nos?|pcs?|pieces?|mt|kg|ton|feet?|meter?|mm|cm|inch|sqft|sqm)/gi
    };
  }

  /**
   * Main parsing function - extracts structured quotation data from prompt text
   * ✅ UPGRADED: Now supports async OpenAI parsing
   * @param {string} promptText - Raw user input text
   * @returns {Promise<object>} Parsed quotation data with confidence score
   */
  async parsePromptToQuote(promptText) {
    console.log('🧠 PromptParser: Processing input:', promptText);
    
    if (!promptText || typeof promptText !== 'string') {
      console.log('❌ PromptParser: Invalid input, returning empty quote');
      return this.getEmptyQuote();
    }

    const cleanText = this.cleanInput(promptText);
    console.log('🧹 PromptParser: Cleaned text:', cleanText);
    
    let result = {
      customerName: this.extractCustomerName(cleanText),
      products: await this.extractProducts(cleanText), // ✅ Now async
      gst: this.extractGST(cleanText),
      transport: this.extractTransport(cleanText),
      loadingCharges: this.extractLoading(cleanText),
      paymentTerms: this.extractPaymentTerms(cleanText),
      priceValidity: this.extractValidity(cleanText),
      confidence: 0,
      source: 'prompt_parser_v2', // Updated version marker
      timestamp: new Date().toISOString(),
      originalText: promptText
    };

    // Calculate confidence score
    result.confidence = this.calculateConfidence(result, cleanText);

    // ✅ Check if critical fields are missing and suggest clarification
    const validationResult = this.validateAndSuggestClarification(result);
    if (validationResult.needsClarification) {
      return validationResult;
    }

    // Enhance with smart defaults
    result = this.applySmartDefaults(result);
    
    console.log('✅ PromptParser: Final result:', {
      customerName: result.customerName,
      productsCount: result.products.length,
      confidence: result.confidence,
      gst: result.gst,
      aiEnhanced: result.products.some(p => p.inferredSection) // Mark if AI enhanced
    });

    return result;
  }

  /**
   * Clean and normalize input text
   */
  cleanInput(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .trim();
  }

  /**
   * Extract customer name from text
   */
  extractCustomerName(text) {
    for (const pattern of this.patterns.customer) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let customerName = match[1].trim();
        // Clean up common prefixes/suffixes
        customerName = customerName
          .replace(/^(m\/s|m\/s\s+|mr\.?|mrs\.?|ms\.?)\s*/i, '')
          .replace(/\s*(ltd\.?|limited|corp\.?|corporation|inc\.?|pvt\.?)$/i, '$1')
          .trim();
        
        if (customerName.length > 2 && customerName.length < 100) {
          return customerName;
        }
      }
    }
    return "Not specified";
  }

  /**
   * Extract products/items from text - ✅ UPGRADED with OpenAI Few-Shot Prompting
   */
  async extractProducts(text) {
    console.log('🔍 PromptParser: Extracting products from text');
    
    let products = [];
    
    // ✅ Step 1: Clean and prepare text for parsing
    const cleanedText = this.prepareTextForMultilineParsing(text);
    console.log('🧹 Cleaned text for parsing:', cleanedText);
    
    // ✅ Step 2: Try OpenAI few-shot prompting first for complex multiline cases
    try {
      if (this.isComplexMultilineFormat(cleanedText)) {
        console.log('🤖 Detected complex format, trying OpenAI few-shot parsing...');
        const aiProducts = await this.extractProductsWithOpenAI(cleanedText);
        if (aiProducts && aiProducts.length > 0) {
          products = aiProducts;
          console.log(`✅ OpenAI extracted ${products.length} products`);
        }
      }
    } catch (error) {
      console.warn('⚠️ OpenAI parsing failed, falling back to regex:', error.message);
    }
    
    // ✅ Step 3: Fallback to regex-based parsing if OpenAI failed or not used
    if (products.length === 0) {
      console.log('🔄 Using regex fallback parsing...');
      const singleLineProducts = this.extractStandardProducts(cleanedText);
      const multiLineProducts = this.extractMultilineProducts(cleanedText);
      products = [...singleLineProducts, ...multiLineProducts];
    }
    
    // ✅ Step 4: Apply intelligent rate inference and section mapping
    const productsWithRates = this.applyRateInference(products, cleanedText);
    
    // ✅ Step 5: Ensure no products are blocked from PDF generation
    const validatedProducts = this.ensurePDFReadyProducts(productsWithRates);
    
    console.log(`✅ Final extracted ${validatedProducts.length} products total`);
    return validatedProducts;
  }

  /**
   * ✅ NEW: Check if text has complex multiline format that benefits from OpenAI
   */
  isComplexMultilineFormat(text) {
    const complexIndicators = [
      /•[^@\n]*×[^@\n]*×[^@\n]*=/i,  // Bullet with calculations
      /\d+(?:\.\d+)?\s*kg\/m\s*×/i,  // kg/m calculations
      /=\s*\d+(?:,\d{3})*(?:\.\d+)?\s*kg/i,  // Weight results
      /\n[^@\n]*\n/,  // Multiple line breaks indicating structure
    ];
    
    return complexIndicators.some(pattern => pattern.test(text));
  }

  /**
   * ✅ NEW: Extract products using OpenAI few-shot prompting
   */
  async extractProductsWithOpenAI(text) {
    const fewShotPrompt = this.buildFewShotPrompt(text);
    
    // Mock OpenAI call for now - replace with actual API integration
    return await this.callOpenAI(fewShotPrompt);
  }

  /**
   * ✅ NEW: Build few-shot prompt with examples
   */
  buildFewShotPrompt(userText) {
    return `You are a quotation assistant. Extract all steel products from the given user message and return a JSON array of objects with the following keys:

- description (string)
- quantity (number)
- uom (unit of measurement, like 'Nos', 'Kg', 'MT', etc.)
- weight (number, if available)
- rate (number, if available)
- length (string, if mentioned like "6 m")
- inferredSection (string, like "CHANNEL", "FLAT", "ANGLE", "TMT", "SHEET", "PIPE", etc.)

Each product can span multiple lines. Here are examples:

**Example 1:**
Input:
1. MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg

Output:
[
  {
    "description": "MS Channel 75x40x6mm",
    "quantity": 140,
    "uom": "Nos",
    "weight": 5992.8,
    "length": "6 m",
    "rate": 50,
    "inferredSection": "CHANNEL"
  }
]

**Example 2:**
Input:
2. MS Flat 75x10mm
• 5.89 kg/m × 6 m × 10 Nos = 353.4 kg

Output:
[
  {
    "description": "MS Flat 75x10mm",
    "quantity": 10,
    "uom": "Nos",
    "weight": 353.4,
    "length": "6 m",
    "rate": 51,
    "inferredSection": "FLAT"
  }
]

**Example 3:**
Input:
5MT TMT bars @ Rs.58

Output:
[
  {
    "description": "TMT bars",
    "quantity": 5,
    "uom": "MT",
    "rate": 58,
    "inferredSection": "TMT"
  }
]

**Section Rate Mapping Rules:**
- If description contains "Flat" → rate: 51, inferredSection: "FLAT"
- If description contains "Angle" or "Channel" → rate: 50, inferredSection: "ANGLE" or "CHANNEL"
- If description contains "TMT" or "Bar" → rate: 52, inferredSection: "TMT"
- If description contains "Sheet" → rate: 55, inferredSection: "SHEET"
- If description contains "Pipe" → rate: 60, inferredSection: "PIPE"
- If description contains "ISMB" or "Beam" → rate: 70, inferredSection: "BEAM"

**Important:** 
- Always return valid JSON array
- If rate is not specified, infer from section type
- If any field is missing, use null or appropriate default
- Extract ALL products from the input

Now extract products from this input:

${userText}`;
  }

  /**
   * ✅ NEW: Call OpenAI API (or mock for development)
   */
  async callOpenAI(prompt) {
    console.log('🤖 OpenAI Prompt:', prompt.substring(0, 200) + '...');
    
    // TODO: Replace with actual OpenAI API call when API key is available
    // Example implementation:
    /*
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4", // or "gpt-3.5-turbo" for cost efficiency
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that extracts product lines from steel quotations."
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      const resultText = data.choices[0].message.content;
      return JSON.parse(resultText);
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
    */
    
    // For now, use mock response for development/testing
    return this.mockOpenAIResponse(prompt);
  }

  /**
   * ✅ NEW: Mock OpenAI response for development (replace with real API)
   */
  mockOpenAIResponse(prompt) {
    // Extract the user input from the prompt
    const userInput = prompt.split('Now extract products from this input:')[1]?.trim();
    
    if (!userInput) return [];
    
    const mockProducts = [];
    
    // Simple pattern matching to simulate OpenAI understanding
    if (userInput.includes('MS Channel') && userInput.includes('kg/m') && userInput.includes('×')) {
      const qtyMatch = userInput.match(/(\d+)\s*Nos/);
      const weightMatch = userInput.match(/=\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*kg/);
      const lengthMatch = userInput.match(/(\d+)\s*m/);
      
      mockProducts.push({
        description: "MS Channel 75x40x6mm",
        quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
        uom: "Nos",
        weight: weightMatch ? parseFloat(weightMatch[1].replace(/,/g, '')) : null,
        length: lengthMatch ? `${lengthMatch[1]} m` : null,
        rate: 50,
        inferredSection: "CHANNEL"
      });
    }
    
    if (userInput.includes('TMT') || userInput.includes('bars')) {
      const qtyMatch = userInput.match(/(\d+(?:\.\d+)?)\s*MT/i);
      const rateMatch = userInput.match(/Rs\.?\s*(\d+(?:\.\d+)?)/i);
      
      mockProducts.push({
        description: "TMT bars",
        quantity: qtyMatch ? parseFloat(qtyMatch[1]) : 1,
        uom: "MT",
        rate: rateMatch ? parseFloat(rateMatch[1]) : 52,
        inferredSection: "TMT"
      });
    }
    
    return mockProducts;
  }

  /**
   * ✅ NEW: Ensure products are ready for PDF generation (never block)
   */
  ensurePDFReadyProducts(products) {
    return products.map(product => {
      // Ensure minimum required fields for PDF generation
      if (!product.description || product.description.trim() === '') {
        product.description = 'Steel Product';
      }
      
      if (!product.qty || product.qty <= 0) {
        product.qty = 1; // Default quantity
      }
      
      if (!product.uom || product.uom.trim() === '') {
        product.uom = 'Nos'; // Default unit
      }
      
      if (!product.rate || product.rate <= 0) {
        // Try to infer rate, or use default
        product.rate = this.inferRateFromDescription(product.description) || 50;
        product.rateSource = 'default';
      }
      
      // Calculate amount if missing
      if (!product.amount) {
        if (product.weight && product.uom.toLowerCase() === 'nos') {
          // For weight-based calculations
          product.amount = product.weight * product.rate;
        } else {
          // Standard quantity × rate
          product.amount = product.qty * product.rate;
        }
      }
      
      return product;
    });
  }

  /**
   * Prepare text for multi-line parsing
   */
  prepareTextForMultilineParsing(text) {
    return text
      // Remove bullet points
      .replace(/[•·‣⁃▪▫]/g, '')
      // Normalize line breaks and spacing
      .replace(/\r\n/g, '\n')
      .replace(/\s*×\s*/g, ' × ')
      .replace(/\s*=\s*/g, ' = ')
      // Clean extra whitespace but preserve line structure
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Extract standard single-line products
   */
  extractStandardProducts(text) {
    const products = [];
    
    for (const pattern of this.patterns.products) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        const product = this.parseStandardMatch(match);
        if (product) {
          products.push(product);
        }
      }
    }
    
    return products;
  }

  /**
   * Extract multi-line products (e.g., "MS Channel 75x40x6mm\n• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg")
   */
  extractMultilineProducts(text) {
    const products = [];
    
    // Multi-line pattern: Description on one line, calculation on next
    const multiLinePattern = /([A-Za-z][^\n@]{3,60})\s*\n\s*([^@\n]*?(\d+(?:\.\d+)?)\s*(kg\/m|per\s*m)?[^@\n]*?×[^@\n]*?×[^@\n]*?(\d+(?:\.\d+)?)\s*(MT|Nos|Kg|pcs|pieces?)[^@\n]*?=\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|MT)?)/gi;
    
    let match;
    while ((match = multiLinePattern.exec(text)) !== null) {
      const product = this.parseMultilineMatch(match);
      if (product) {
        products.push(product);
        console.log('✅ Parsed multi-line product:', product);
      }
    }
    
    return products;
  }

  /**
   * Parse standard single-line match
   */
  parseStandardMatch(match) {
    // Handle different pattern groups based on pattern type
    if (match.length >= 5) {
      const [, first, second, third, fourth, fifth] = match;
      
      // Pattern 1: "5MT TMT bars @ Rs.58" (qty, uom, desc, rate)
      if (this.isNumeric(first) && this.isUOM(second)) {
        return {
          description: this.cleanDescription(third),
          qty: parseFloat(first),
          uom: this.normalizeUOM(second),
          rate: parseFloat(fourth) || null,
          amount: null // Will be calculated later
        };
      }
      // Pattern 2: "TMT bars 5MT @ 58" (desc, qty, uom, rate)
      else if (this.isNumeric(second) && this.isUOM(third)) {
        return {
          description: this.cleanDescription(first),
          qty: parseFloat(second),
          uom: this.normalizeUOM(third),
          rate: parseFloat(fourth) || null,
          amount: null
        };
      }
    }
    
    return null;
  }

  /**
   * Parse multi-line match for complex calculations
   */
  parseMultilineMatch(match) {
    const [, description, calcLine, unitWeight, weightUnit, quantity, uom, totalWeight, weightUOM] = match;
    
    const product = {
      description: this.cleanDescription(description),
      qty: parseFloat(quantity) || null,
      uom: this.normalizeUOM(uom),
      weight: parseFloat(totalWeight.replace(/,/g, '')) || null,
      unitWeight: parseFloat(unitWeight) || null,
      rate: null, // Will be inferred
      amount: null
    };
    
    // Extract length if present in calculation
    const lengthMatch = calcLine.match(/×\s*(\d+(?:\.\d+)?)\s*m/);
    if (lengthMatch) {
      product.length = parseFloat(lengthMatch[1]);
    }
    
    return product;
  }

  /**
   * Apply intelligent rate inference based on product description
   */
  applyRateInference(products, text) {
    // Extract section group rates from text
    const sectionRates = this.extractSectionRates(text);
    
    return products.map(product => {
      if (!product.rate) {
        product.rate = this.inferRateFromDescription(product.description, sectionRates);
      }
      
      // Calculate amount if missing
      if (!product.amount && product.qty && product.rate) {
        if (product.weight) {
          // For weight-based calculations, use total weight
          product.amount = product.weight * product.rate;
        } else {
          // Standard quantity × rate
          product.amount = product.qty * product.rate;
        }
      }
      
      return product;
    });
  }

  /**
   * Extract section group rates like "Flat - 51+GST" - ✅ UPGRADED
   */
  extractSectionRates(text) {
    const rates = {};
    
    // ✅ Enhanced patterns for various formats
    const sectionRatePatterns = [
      // "Flat - 51+GST" or "ANGLE AND CHANNEL – 50₹ + GST"
      /(Flat|Angle|Channel|Sheet|Pipe|Bar|Beam|Column|TMT)\s*[-–]\s*(\d+(?:\.\d+)?)[\s₹]*\s*[+]?\s*GST/gi,
      // "Flat: 51" or "Angle: 50"  
      /(Flat|Angle|Channel|Sheet|Pipe|Bar|Beam|Column|TMT)\s*[:\-]\s*(\d+(?:\.\d+)?)/gi,
      // "ANGLE AND CHANNEL – 50"
      /(?:ANGLE\s+AND\s+CHANNEL|Angle\s+and\s+Channel)\s*[-–]\s*(\d+(?:\.\d+)?)/gi
    ];
    
    sectionRatePatterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      while ((match = pattern.exec(text)) !== null) {
        const [fullMatch, section, rate, specialRate] = match;
        
        // Handle special "ANGLE AND CHANNEL" case
        if (fullMatch.toLowerCase().includes('angle') && fullMatch.toLowerCase().includes('channel')) {
          rates.angle = parseFloat(specialRate || rate);
          rates.channel = parseFloat(specialRate || rate);
          console.log(`📊 Found combined rate: Angle & Channel = ${specialRate || rate}`);
        } else {
          rates[section.toLowerCase()] = parseFloat(rate);
          console.log(`📊 Found section rate: ${section} = ${rate}`);
        }
      }
    });
    
    return rates;
  }

  /**
   * Infer rate from product description using section mapping
   */
  inferRateFromDescription(description, sectionRates = {}) {
    const desc = description.toLowerCase();
    
    // Check for specific rates from text
    if (desc.includes('flat') && sectionRates.flat) {
      return sectionRates.flat;
    }
    if ((desc.includes('angle') || desc.includes('channel')) && (sectionRates.angle || sectionRates.channel)) {
      return sectionRates.angle || sectionRates.channel || 50;
    }
    if (desc.includes('sheet') && sectionRates.sheet) {
      return sectionRates.sheet;
    }
    if (desc.includes('pipe') && sectionRates.pipe) {
      return sectionRates.pipe;
    }
    
    // Default intelligent mapping
    if (desc.includes('flat')) return 51;
    if (desc.includes('angle') || desc.includes('channel')) return 50;
    if (desc.includes('tmt') || desc.includes('bar')) return 52;
    if (desc.includes('sheet')) return 55;
    if (desc.includes('pipe')) return 60;
    if (desc.includes('ismb') || desc.includes('beam')) return 70;
    
    // Fallback default rate
    return 50;
  }

  /**
   * Helper: Check if string is numeric
   */
  isNumeric(str) {
    return !isNaN(parseFloat(str)) && isFinite(str);
  }

  /**
   * Helper: Check if string is a unit of measurement
   */
  isUOM(str) {
    const uoms = ['MT', 'Nos', 'Kg', 'pcs', 'pieces', 'ton', 'tonnes', 'ft', 'meter', 'metre'];
    return uoms.some(uom => str.toLowerCase().includes(uom.toLowerCase()));
  }

  /**
   * Clean product description
   */
  cleanDescription(desc) {
    return desc
      .replace(/^\s*[,.\-:]\s*/, '')
      .replace(/\s*[,.\-:]\s*$/, '')
      .trim();
  }

  /**
   * Normalize unit of measurement
   */
  normalizeUOM(uom) {
    const normalized = uom.toLowerCase();
    const mappings = {
      'nos': 'Nos',
      'no': 'Nos',
      'pcs': 'Nos',
      'pieces': 'Nos',
      'piece': 'Nos',
      'mt': 'MT',
      'ton': 'MT',
      'kg': 'Kg',
      'kilogram': 'Kg',
      'feet': 'Ft',
      'foot': 'Ft',
      'meter': 'Mtr',
      'metre': 'Mtr',
      'mm': 'mm',
      'cm': 'cm',
      'inch': 'inch',
      'sqft': 'SqFt',
      'sqm': 'SqMtr'
    };
    
    return mappings[normalized] || uom;
  }

  /**
   * Extract GST percentage
   */
  extractGST(text) {
    for (const pattern of this.patterns.gst) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const gst = parseFloat(match[1]);
        if (gst >= 0 && gst <= 28) { // Valid GST range in India
          return gst;
        }
      }
    }

    // Check for implicit GST mentions
    if (/\+\s*gst/i.test(text) || /gst\s*extra/i.test(text)) {
      return 18; // Default GST for steel products
    }

    if (/inclusive\s+of\s+gst/i.test(text) || /rates?\s+inclusive/i.test(text)) {
      return 0; // GST already included
    }

    return 18; // Default GST for steel industry
  }

  /**
   * Extract transport information
   */
  extractTransport(text) {
    for (const pattern of this.patterns.transport) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const transport = match[1].trim();
        if (transport.length > 2) {
          return this.capitalizeFirst(transport);
        }
      }
    }

    // Check for common transport keywords
    if (/transport\s+included/i.test(text) || /freight\s+included/i.test(text)) {
      return "Included";
    }
    if (/transport\s+extra/i.test(text) || /freight\s+extra/i.test(text)) {
      return "Extra";
    }
    if (/buyer\s+arrangement/i.test(text) || /to\s+pay/i.test(text)) {
      return "Buyer arrangement";
    }

    return "Not specified";
  }

  /**
   * Extract loading charges
   */
  extractLoading(text) {
    for (const pattern of this.patterns.loading) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const loading = match[1].trim();
        if (loading.length > 2) {
          return this.capitalizeFirst(loading);
        }
      }
    }

    // Check for common loading keywords
    if (/loading\s+included/i.test(text)) {
      return "Included";
    }
    if (/loading\s+extra/i.test(text)) {
      return "Extra";
    }

    return "Not specified";
  }

  /**
   * Extract payment terms
   */
  extractPaymentTerms(text) {
    for (const pattern of this.patterns.payment) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const terms = match[1].trim();
        if (terms.length > 2) {
          return this.capitalizeFirst(terms);
        }
      }
    }

    // Check for common payment terms
    if (/cod/i.test(text) || /cash\s+on\s+delivery/i.test(text)) {
      return "COD";
    }
    if (/advance/i.test(text)) {
      const advanceMatch = text.match(/(\d+)%?\s*advance/i);
      if (advanceMatch) {
        return `${advanceMatch[1]}% advance`;
      }
      return "Advance";
    }
    if (/against\s+invoice/i.test(text)) {
      return "Against Invoice";
    }

    return "Not specified";
  }

  /**
   * Extract price validity
   */
  extractValidity(text) {
    for (const pattern of this.patterns.validity) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const validity = match[1].trim();
        if (validity.length > 1) {
          return this.capitalizeFirst(validity);
        }
      }
    }

    return "Not specified";
  }

  /**
   * Calculate confidence score based on extracted data
   */
  calculateConfidence(result, text) {
    let score = 0;
    const weights = {
      customerName: 25,
      products: 40,
      gst: 10,
      transport: 5,
      loadingCharges: 5,
      paymentTerms: 10,
      priceValidity: 5
    };

    // Customer name confidence
    if (result.customerName !== "Not specified") {
      score += weights.customerName;
    }

    // Products confidence
    if (result.products.length > 0) {
      score += weights.products;
      // Bonus for multiple products
      if (result.products.length > 1) {
        score += 5;
      }
    }

    // Other fields confidence
    Object.keys(weights).forEach(field => {
      if (field !== 'customerName' && field !== 'products') {
        if (result[field] && result[field] !== "Not specified") {
          score += weights[field];
        }
      }
    });

    // Bonus for structured text
    if (/quote|quotation|estimate/i.test(text)) {
      score += 5;
    }

    // Penalty for very short text
    if (text.length < 50) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * ✅ NEW: Validate result and suggest clarification for missing critical fields
   */
  validateAndSuggestClarification(result) {
    const missingFields = [];
    const suggestions = [];
    
    // Check for missing customer name
    if (!result.customerName || result.customerName === "Not specified") {
      missingFields.push("customerName");
      suggestions.push("Could you please specify the customer name? (e.g., 'for ABC Industries')");
    }
    
    // Check for missing or incomplete products
    if (!result.products || result.products.length === 0) {
      missingFields.push("products");
      suggestions.push("Could you please provide product details with quantity and specifications?");
    } else {
      // Check individual products for missing critical data
      const incompleteProducts = result.products.filter(p => !p.qty || !p.description);
      if (incompleteProducts.length > 0) {
        missingFields.push("productDetails");
        suggestions.push("Some products are missing quantity or description. Could you clarify?");
      }
    }
    
    // If critical fields are missing, return clarification request
    if (missingFields.length > 0) {
      return {
        success: false,
        needsClarification: true,
        missingFields: missingFields,
        suggestions: suggestions,
        clarificationMessage: `I need a bit more information to create your quotation:\n\n${suggestions.join('\n')}\n\nCould you please provide these details?`,
        partialData: result, // Keep what we parsed so far
        confidence: result.confidence
      };
    }
    
    return { needsClarification: false };
  }

  /**
   * Apply smart defaults based on industry standards - ✅ UPGRADED
   */
  applySmartDefaults(result) {
    // Default GST if not specified and products exist
    if (result.products.length > 0 && (!result.gst || result.gst === 0)) {
      result.gst = 18; // Default for steel products
    }

    // Add default price validity
    if (!result.priceValidity || result.priceValidity === "Not specified") {
      result.priceValidity = "7 days";
    }

    // ✅ Apply intelligent defaults for products missing rates
    if (result.products && result.products.length > 0) {
      result.products = result.products.map(product => {
        if (!product.rate || product.rate === 0) {
          product.rate = this.inferRateFromDescription(product.description);
          product.rateSource = 'inferred'; // Mark as inferred for transparency
        }
        
        // Recalculate amount if missing
        if (!product.amount && product.qty && product.rate) {
          if (product.weight) {
            product.amount = product.weight * product.rate;
          } else {
            product.amount = product.qty * product.rate;
          }
        }
        
        return product;
      });
    }

    return result;
  }

  /**
   * Capitalize first letter of string
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Get empty quote structure
   */
  getEmptyQuote() {
    return {
      customerName: "Not specified",
      products: [],
      gst: 18,
      transport: "Not specified",
      loadingCharges: "Not specified",
      paymentTerms: "Not specified",
      priceValidity: "7 days",
      confidence: 0,
      source: 'prompt_parser',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate parsed result
   */
  validateResult(result) {
    const issues = [];

    if (!result.customerName || result.customerName === "Not specified") {
      issues.push("Customer name not found");
    }

    if (!result.products || result.products.length === 0) {
      issues.push("No products found");
    }

    result.products.forEach((product, index) => {
      if (!product.description) {
        issues.push(`Product ${index + 1}: Missing description`);
      }
      if (!product.qty || product.qty <= 0) {
        issues.push(`Product ${index + 1}: Invalid quantity`);
      }
      if (!product.rate || product.rate <= 0) {
        issues.push(`Product ${index + 1}: Invalid rate`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues: issues,
      completeness: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Get suggestions for improving input
   */
  getSuggestions(result) {
    const suggestions = [];
    const validation = this.validateResult(result);

    if (result.customerName === "Not specified") {
      suggestions.push("Add customer name: 'Quote for [Customer Name]:'");
    }

    if (result.products.length === 0) {
      suggestions.push("Add product details: '[Product] - [Qty] [Unit] @ ₹[Rate]'");
    }

    if (result.confidence < 70) {
      suggestions.push("Try a more structured format like training examples");
    }

    return suggestions;
  }

  /**
   * Test parser with training data
   */
  testWithTrainingData() {
    const results = [];
    
    this.trainingData.forEach((sample, index) => {
      const parsed = this.parsePromptToQuote(sample.input);
      const validation = this.validateResult(parsed);
      
      results.push({
        sampleIndex: index,
        input: sample.input,
        expected: sample.expected,
        parsed: parsed,
        validation: validation,
        confidence: parsed.confidence
      });
    });

    return results;
  }
}

// Export singleton instance
const promptParser = new PromptParser();

export default promptParser;
export { PromptParser }; 