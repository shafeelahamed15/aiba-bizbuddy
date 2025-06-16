export const parseQuotationPrompt = (promptText) => {
  console.log("🔍 Parsing input:", promptText);
  
  const data = {
    customerName: "",
    products: [],
    gstPercent: null,
    transport: "",
    loadingCharges: "",
    paymentTerms: "",
    deliveryPeriod: "",
    priceValidity: "",
    calculationMode: "per_kg" // Default mode
  };

  const lower = promptText.toLowerCase();

  // 🔍 DETECT CALCULATION MODE - UOM in meters vs kg
  const meterModeKeywords = [
    "uom to be in mtrs",
    "uom to be in meters", 
    "rate per meter",
    "quote in meters",
    "uom in mtrs",
    "uom in meters",
    "per mtr",
    "per meter"
  ];

  if (meterModeKeywords.some(keyword => lower.includes(keyword))) {
    data.calculationMode = "per_mtr";
    console.log("🔍 Detected calculation mode: per_mtr");
  }

  // CUSTOMER NAME - Enhanced patterns
  const customerPatterns = [
    /quote\s+to\s+(.*?)\s+(?:for|regarding|:)/i,
    /(?:for|to)\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i,
    /quotation\s+for\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i,
    /quote\s+for\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i,
    // Fallback: Look for first capitalized phrase before "for"
    /([A-Z][A-Za-z\s&.,\-()]+?)\s+(?:for|regarding|:)/i
  ];
  
  for (const pattern of customerPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.customerName = match[1].trim().replace(/[,\s]+$/, '');
      console.log("🔍 Found customer:", data.customerName);
      break;
    }
  }

  // ITEMS & RATES - Enhanced patterns with meter mode support
  const itemPatterns = [
    // New simple pattern: <Material> <Size> – <Quantity> <UOM> at ₹<Rate>/kg
    /([\w\s]+)\s+(\d+x\d+)\s*[-–]\s*(\d+\.?\d*)\s*(MT|KGS|kg|Nos|meters|mtrs)?\s*(?:at)?\s*₹?(\d+\.?\d*)/i,
    
    // Pattern for meter mode: "MS Channel 75x40x6mm – 6 MTR (Length) – 140 Nos – ₹366.18/mtr"
    /([A-Za-z\s\-x0-9]+?)\s*–\s*(\d+(?:\.\d+)?)\s*MTR?\s*(?:\(Length\))?\s*–\s*(\d+)\s*Nos?\s*–\s*₹?([0-9.]+)\/mtr/gi,
    // Pattern: 5MT ISMC 100x50 @ Rs.56
    /([0-9.]+)\s?(mt|nos|kgs?|kg)\s+([A-Za-z\s\-x0-9]+?)\s*@\s*rs\.?\s*([0-9.]+)/gi,
    // Pattern: ISMC 100x50 5MT @ 56
    /([A-Za-z\s\-x0-9]+?)\s+([0-9.]+)\s?(mt|nos|kgs?|kg)\s*@\s*rs\.?\s*([0-9.]+)/gi,
    // Pattern: 5000kg steel @ 50
    /([0-9.]+)\s?(mt|nos|kgs?|kg)?\s+([A-Za-z\s\-x0-9]+?)\s*@\s*([0-9.]+)/gi
  ];

  for (const pattern of itemPatterns) {
    const matches = [...promptText.matchAll(pattern)];
    for (const match of matches) {
      let description, quantity, unit, rate, lengthInMeters;
      
      // Check if this is the meter mode pattern
      if (pattern.source.includes('MTR')) {
        // Meter mode pattern: description – length MTR – quantity Nos – rate/mtr
        [, description, lengthInMeters, quantity, rate] = match;
        
        const pieces = parseInt(quantity);
        const lengthPerPiece = parseFloat(lengthInMeters);
        const ratePerMeter = parseFloat(rate);
        
        // Calculate total meters and amount
        const totalMeters = pieces * lengthPerPiece;
        const totalAmount = totalMeters * ratePerMeter;
        
        data.products.push({
          description: description.trim(),
          quantity: data.calculationMode === "per_mtr" ? totalMeters : pieces,
          unit: data.calculationMode === "per_mtr" ? "Mtrs" : "Nos",
          rate: ratePerMeter,
          rateUnit: "per mtr",
          lengthInMeters: lengthPerPiece,
          numberOfPieces: pieces,
          totalMeters: totalMeters,
          amount: totalAmount,
          calculationMode: data.calculationMode
        });
        
        console.log("🔍 Found meter mode item:", { 
          description: description.trim(), 
          pieces, 
          lengthPerPiece, 
          totalMeters, 
          ratePerMeter, 
          totalAmount 
        });
      } else {
        // Handle other patterns (existing logic)
        if (pattern.source.includes('([A-Za-z')) { // Description first pattern
          [, description, quantity, unit, rate] = match;
        } else { // Quantity first pattern
          [, quantity, unit, description, rate] = match;
        }
        
        // Convert MT to kg
        const qty = parseFloat(quantity);
        const convertedQty = unit?.toLowerCase() === 'mt' ? qty * 1000 : qty;
        const unitDisplay = unit?.toLowerCase() === 'mt' ? 'kg' : (unit || 'nos');
        
        data.products.push({
          description: description.trim(),
          quantity: convertedQty,
          unit: unitDisplay,
          rate: parseFloat(rate),
          rateUnit: "per kg",
          calculationMode: data.calculationMode
        });
        
        console.log("🔍 Found item:", { description: description.trim(), quantity: convertedQty, unit: unitDisplay, rate: parseFloat(rate) });
      }
    }
  }

  // GST - Enhanced patterns
  const gstPatterns = [
    /gst\s?(\d+)%?/i,
    /(\d+)%\s?gst/i,
    /tax\s?(\d+)%?/i
  ];
  
  for (const pattern of gstPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.gstPercent = parseInt(match[1]);
      console.log("🔍 Found GST:", data.gstPercent);
      break;
    }
  }

  // TRANSPORT & LOADING - Enhanced patterns
  if (lower.includes("transport included") || lower.includes("transport inc")) {
    data.transport = "Included";
  } else if (lower.includes("transport extra") || lower.includes("transport exc")) {
    data.transport = "Extra";
  }

  // Loading charges patterns
  const loadingPatterns = [
    /loading\s+charges?\s+rs\.?\s?([0-9]+)/i,
    /loading\s+rs\.?\s?([0-9]+)/i,
    /loading\s+([0-9]+)/i
  ];
  
  for (const pattern of loadingPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.loadingCharges = `Rs.${match[1]} per MT`;
      console.log("🔍 Found loading charges:", data.loadingCharges);
      break;
    }
  }

  // PAYMENT TERMS
  const paymentPatterns = [
    /payment\s+(immediate|advance|30\s?days?|15\s?days?|cash)/i,
    /(immediate|advance)\s+payment/i
  ];
  
  for (const pattern of paymentPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.paymentTerms = match[1];
      console.log("🔍 Found payment terms:", data.paymentTerms);
      break;
    }
  }

  // DELIVERY PERIOD
  const deliveryPatterns = [
    /delivery\s+(\d+\s?days?)/i,
    /within\s+(\d+\s?days?)/i
  ];
  
  for (const pattern of deliveryPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.deliveryPeriod = `Within ${match[1]}`;
      console.log("🔍 Found delivery period:", data.deliveryPeriod);
      break;
    }
  }

  // PRICE VALIDITY
  const validityPatterns = [
    /valid(?:ity)?\s+(\d+\s?days?)/i,
    /price\s+valid\s+(\d+\s?days?)/i
  ];
  
  for (const pattern of validityPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.priceValidity = match[1];
      console.log("🔍 Found price validity:", data.priceValidity);
      break;
    }
  }

  console.log("🔍 Final parsed data:", data);
  return data;
}; 