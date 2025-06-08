// Steel Knowledge Base for AIBA Assistant

export const steelKnowledge = {
  // Steel Types and Specifications
  steelTypes: {
    'TMT': {
      fullName: 'Thermo Mechanically Treated',
      description: 'High strength steel bars with superior ductility and earthquake resistance',
      applications: ['Construction', 'High-rise buildings', 'Bridges', 'Infrastructure'],
      grades: ['Fe 415', 'Fe 500', 'Fe 550', 'Fe 600'],
      advantages: ['Better elongation', 'Higher yield strength', 'Earthquake resistant', 'Corrosion resistant']
    },
    'MS': {
      fullName: 'Mild Steel',
      description: 'Low carbon steel with good weldability and formability',
      applications: ['General construction', 'Fabrication', 'Automotive', 'Machinery'],
      grades: ['Fe 250', 'Fe 410', 'Fe 415'],
      advantages: ['Cost effective', 'Easy to weld', 'Good formability', 'Widely available']
    },
    'SS': {
      fullName: 'Stainless Steel',
      description: 'Corrosion resistant steel with chromium content',
      applications: ['Food industry', 'Chemical plants', 'Marine', 'Architecture'],
      grades: ['304', '316', '410', '430'],
      advantages: ['Corrosion resistant', 'Hygienic', 'Aesthetic appeal', 'Long lasting']
    },
    'HR': {
      fullName: 'Hot Rolled',
      description: 'Steel processed at high temperatures for strength',
      applications: ['Structural work', 'Heavy construction', 'Industrial equipment'],
      advantages: ['High strength', 'Cost effective', 'Good for heavy loads']
    },
    'CR': {
      fullName: 'Cold Rolled',
      description: 'Steel processed at room temperature for precision',
      applications: ['Automotive panels', 'Appliances', 'Precision parts'],
      advantages: ['Better surface finish', 'Precise dimensions', 'Higher strength']
    }
  },

  // Product Categories
  products: {
    'bars': ['TMT Bars', 'MS Rounds', 'Deformed Bars', 'Plain Bars'],
    'sheets': ['HR Sheets', 'CR Sheets', 'Galvanized Sheets', 'Checkered Plates'],
    'structural': ['I-Beams (ISMB)', 'Channels (ISMC)', 'Angles (ISA)', 'H-Beams'],
    'pipes': ['MS Pipes', 'GI Pipes', 'Seamless Pipes', 'ERW Pipes'],
    'flats': ['MS Flats', 'SS Flats', 'Bright Bars'],
    'wire': ['Binding Wire', 'Galvanized Wire', 'Barbed Wire']
  },

  // Market Insights
  marketTrends: {
    factors: ['Raw material costs', 'Demand-supply dynamics', 'Government policies', 'Infrastructure projects'],
    seasonality: 'Higher demand during construction season (Oct-Mar)',
    priceDrivers: ['Coal prices', 'Iron ore availability', 'Transportation costs', 'Government duties']
  },

  // Quality Standards
  standards: {
    'IS': 'Indian Standards - IS 1786 (TMT), IS 2062 (Structural)',
    'ASTM': 'American Standards - ASTM A615 (Rebar), ASTM A36 (Structural)',
    'BS': 'British Standards - BS 4449 (Rebar), BS EN 10025 (Structural)'
  },

  // Business Tips
  businessTips: [
    'Maintain optimal inventory levels based on seasonal demand',
    'Build relationships with multiple suppliers for better rates',
    'Focus on quality certifications to command premium prices',
    'Offer value-added services like cutting and bending',
    'Monitor market trends and adjust pricing accordingly'
  ]
};

// Intent Detection Functions
export const detectGreeting = (message) => {
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
    'namaste', 'greetings', 'howdy', 'sup', 'yo', 'hiya'
  ];
  return greetings.some(greeting => 
    message.toLowerCase().trim().includes(greeting)
  );
};

export const detectQuestion = (message) => {
  const questionWords = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'difference between', 'tell me about', 'explain', 'help me understand'
  ];
  const hasQuestionMark = message.includes('?');
  const hasQuestionWord = questionWords.some(word => 
    message.toLowerCase().includes(word)
  );
  return hasQuestionMark || hasQuestionWord;
};

export const detectQuotationRequest = (message) => {
  const quotationKeywords = [
    'quote', 'quotation', 'price', 'rate', 'cost', 'estimate',
    'MT', 'tonnes', 'tons', 'kg', 'nos', '@', '+GST',
    'ISMB', 'ISMC', 'ISA', 'TMT', 'HR SHEET', 'CR SHEET'
  ];
  
  const hasQuantity = /\d+\s*(MT|tonnes?|tons?|kgs?|nos)/i.test(message);
  const hasKeyword = quotationKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return hasQuantity || hasKeyword;
};

// Knowledge Response Generator
export const generateSteelResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // TMT vs MS comparison
  if (lowerMessage.includes('tmt') && lowerMessage.includes('ms') && 
      (lowerMessage.includes('difference') || lowerMessage.includes('compare'))) {
    return `**TMT vs MS Steel Bars - Key Differences:**

🏗️ **TMT (Thermo Mechanically Treated):**
• Superior strength & ductility
• Better earthquake resistance  
• Corrosion resistant outer layer
• Ideal for high-rise construction
• Price: ₹5-8 higher per kg than MS

⚡ **MS (Mild Steel):**
• Basic strength, good weldability
• Cost-effective option
• Suitable for general construction
• Easier to cut and bend
• More economical for smaller projects

**Recommendation:** TMT for critical structures, MS for general construction.

Would you like a quotation for either type?`;
  }

  // Steel grades question
  if (lowerMessage.includes('grade') && (lowerMessage.includes('fe') || lowerMessage.includes('steel'))) {
    return `**Steel Grades Explained:**

🔢 **Common Grades:**
• **Fe 415:** Standard grade for general construction
• **Fe 500:** Higher strength for multi-story buildings  
• **Fe 550:** Premium grade for high-rise structures
• **Fe 600:** Ultra-high strength for special applications

📊 **Grade Selection:**
• Residential: Fe 415 is sufficient
• Commercial: Fe 500 recommended
• High-rise: Fe 550/600 for critical areas

The number indicates yield strength in N/mm². Higher grade = stronger but costlier.

Need a quotation for specific grades?`;
  }

  // Market trends
  if (lowerMessage.includes('market') || lowerMessage.includes('price trend') || lowerMessage.includes('rates')) {
    return `**Current Steel Market Insights:**

📈 **Price Trends:**
• TMT Bars: ₹68-75/kg (depending on grade)
• HR Sheets: ₹52-58/kg  
• Structural Steel: ₹50-65/kg
• Prices vary by location & quantity

🎯 **Market Factors:**
• Raw material costs (Iron ore, Coal)
• Seasonal demand patterns
• Government infrastructure projects
• Import duties and policies

💡 **Business Tips:**
• Buy in bulk during off-season (Apr-Sep)
• Monitor weekly price fluctuations
• Maintain 15-30 days inventory

Would you like current rates for specific products?`;
  }

  // General steel information
  if (lowerMessage.includes('steel') || lowerMessage.includes('iron')) {
    return `**Steel Trading Business Guide:**

🏭 **Popular Products:**
• TMT Bars (Fe 415, 500, 550)
• Structural Steel (ISMB, ISMC, ISA)
• HR/CR Sheets & Coils
• MS Pipes & Tubes
• Galvanized Products

📋 **Quality Standards:**
• IS 1786 (TMT Bars)
• IS 2062 (Structural Steel)
• IS 1239 (Pipes)

💼 **Business Success Tips:**
• Focus on quality certifications
• Build supplier relationships
• Offer value-added services
• Monitor market trends closely

How can I assist you with your steel business today?`;
  }

  return null; // No specific knowledge match
}; 