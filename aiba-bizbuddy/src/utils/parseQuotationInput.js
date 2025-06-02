export const parseQuotationPrompt = (promptText) => {
  console.log("🔍 Parsing input:", promptText);
  
  const data = {
    customerName: "",
    items: [],
    gstPercent: null,
    transport: "",
    loadingCharges: "",
    paymentTerms: "",
    deliveryPeriod: "",
    priceValidity: ""
  };

  const lower = promptText.toLowerCase();

  // CUSTOMER NAME - Enhanced patterns
  const customerPatterns = [
    /(?:for|to)\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i,
    /quotation\s+for\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i,
    /quote\s+for\s+([A-Za-z\s&.,\-()]+?)(?:[,\s]|$)/i
  ];
  
  for (const pattern of customerPatterns) {
    const match = promptText.match(pattern);
    if (match) {
      data.customerName = match[1].trim().replace(/[,\s]+$/, '');
      console.log("🔍 Found customer:", data.customerName);
      break;
    }
  }

  // ITEMS & RATES - Enhanced patterns
  const itemPatterns = [
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
      let description, quantity, unit, rate;
      
      // Handle different capture group orders
      if (pattern.source.includes('([A-Za-z')) { // Description first pattern
        [, description, quantity, unit, rate] = match;
      } else { // Quantity first pattern
        [, quantity, unit, description, rate] = match;
      }
      
      // Convert MT to kg
      const qty = parseFloat(quantity);
      const convertedQty = unit?.toLowerCase() === 'mt' ? qty * 1000 : qty;
      const unitDisplay = unit?.toLowerCase() === 'mt' ? 'kg' : (unit || 'nos');
      
      data.items.push({
        description: description.trim(),
        quantity: convertedQty,
        unit: unitDisplay,
        rate: parseFloat(rate),
      });
      
      console.log("🔍 Found item:", { description: description.trim(), quantity: convertedQty, unit: unitDisplay, rate: parseFloat(rate) });
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