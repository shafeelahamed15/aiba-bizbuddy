/**
 * 💼 Long Form Purchase Order Parsing Intent
 *
 * This function identifies when a user prompt is meant to create a purchase order,
 * then intelligently extracts fields such as:
 * - Supplier name & address
 * - Material description, quantity, rate (convert to weight if needed)
 * - Dispatch mode, destination, payment terms, reference no/date
 * - GST type (IGST/CGST), % if mentioned
 */

const isPurchaseOrderPrompt = (text) => {
  const keywords = [
    "create a purchase order", "make po", "raise po", "generate purchase order",
    "order to", "po to", "issue purchase order", "supplier", "bill from",
    "purchase order for", "create po", "new po", "send po"
  ];
  return keywords.some((kw) => text.toLowerCase().includes(kw));
};

const parsePromptToPurchaseOrder = (prompt) => {
  // Example Input:
  // "Create a purchase order to Rajam Steel Traders, Chennai for 45 nos HR Sheet 1.6mm 1250x2500mm @ ₹57.5 + GST.
  // Ship to Trichy, Ref No REF123 dated 08-06-2025. Dispatch via lorry. Payment: 30 days credit.
  // Destination: Trichy Yard. Mention confirmed by Mr. Ravi"

  const poData = {
    customerName: "",       // e.g., Rajam Steel Traders, Chennai
    items: [],              // [{ description, quantity, rate, uom }]
    transport: "",          // e.g., "lorry"
    paymentTerms: "",       // e.g., "30 days credit"
    referenceNo: "",        // e.g., REF123
    referenceDate: "",      // e.g., 08-06-2025
    dispatchedThrough: "",  // e.g., lorry
    destination: "",        // e.g., Trichy Warehouse
    additionalNotes: "",    // Confirmed by, if any
    gstType: "IGST",        // Default IGST unless mentioned
    gstPercent: 18,         // Default to 18
  };

  // Extract customer/supplier name
  const customerPatterns = [
    /(?:purchase order|po|order)\s+(?:to|from)\s+([^,\n]+?)(?:,|\s+for|\s+\w+\d)/i,
    /(?:supplier|vendor):\s*([^,\n]+)/i,
    /(?:to|from)\s+([A-Z][^,\n]*?)\s*(?:,|for|\s+Chennai|\s+Mumbai|\s+Delhi)/i
  ];

  for (const pattern of customerPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.customerName = match[1].trim();
      break;
    }
  }

  // Extract items with enhanced parsing
  const itemPatterns = [
    // Format: "45 nos of HR Sheet 1.6mm 1250x2500mm @ ₹57.5"
    /(\d+)\s*(nos|pcs|pieces|mt|tonnes?|tons?|kgs?|kg)\s+(?:of\s+)?([^@\n]+?)\s*@\s*₹?(\d+(?:\.\d+)?)/gi,
    // Format: "HR Sheet 1.6mm - 45 nos @ ₹57.5"
    /([^-\n]+?)\s*-\s*(\d+)\s*(nos|pcs|pieces|mt|tonnes?|tons?|kgs?|kg)\s*@\s*₹?(\d+(?:\.\d+)?)/gi,
    // Format: "TMT 12mm 100 nos ₹55/kg"
    /([A-Z][^0-9\n]*?)\s+(\d+)\s*(nos|pcs|pieces|mt|tonnes?|tons?|kgs?|kg)\s*₹?(\d+(?:\.\d+)?)/gi,
    // Format: "5MT TMT bars @ ₹58/kg"
    /(\d+(?:\.\d+)?)\s*(nos|pcs|pieces|mt|tonnes?|tons?|kgs?|kg)\s+([^@\n]+?)\s*@\s*₹?(\d+(?:\.\d+)?)/gi
  ];

  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      let description, quantity, unit, rate;
      
      if (pattern.source.includes('(?:of\\s+)?')) {
        // Format 1: quantity unit of description @ rate
        [, quantity, unit, description, rate] = match;
      } else if (pattern.source.includes('-')) {
        // Format 2: description - quantity unit @ rate
        [, description, quantity, unit, rate] = match;
      } else if (pattern.source.includes('[A-Z]')) {
        // Format 3: description quantity unit rate
        [, description, quantity, unit, rate] = match;
      } else {
        // Format 4: quantity unit description @ rate
        [, quantity, unit, description, rate] = match;
      }

      const parsedQuantity = parseFloat(quantity);
      const parsedRate = parseFloat(rate);

      poData.items.push({
        description: description.trim(),
        quantity: parsedQuantity,
        rate: parsedRate,
        uom: unit.toLowerCase()
      });
    }
  }

  // Extract reference number and date
  const refPatterns = [
    /reference\s+(?:no|number)\.?\s*(?:is\s+)?([A-Z0-9]+)(?:\s+dated\s+(\d{2}-\d{2}-\d{4}))?/i,
    /ref\.?\s*(?:no|number)?\.?\s*(?:is\s+)?([A-Z0-9]+)(?:\s+dated\s+(\d{2}-\d{2}-\d{4}))?/i,
    /reference:\s*([A-Z0-9]+)(?:\s+dated?\s+(\d{2}-\d{2}-\d{4}))?/i
  ];

  for (const pattern of refPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.referenceNo = match[1] || "";
      poData.referenceDate = match[2] || "";
      break;
    }
  }

  // Extract dispatch method/transport
  const transportPatterns = [
    /dispatch\s+(?:through|via|by)\s+([^.\n]+)/i,
    /(?:via|by|through)\s+(lorry|truck|transport|courier|ship|air|rail|road)/i,
    /transport\s+(?:mode|method):\s*([^.\n]+)/i
  ];

  for (const pattern of transportPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.transport = match[1].trim();
      poData.dispatchedThrough = match[1].trim();
      break;
    }
  }

  // Extract destination
  const destinationPatterns = [
    /destination:\s*([^.\n]+)/i,
    /ship\s+to\s+(?:our\s+)?([^.\n]+?)(?:\s+branch|\s+warehouse|\.)/i,
    /deliver\s+to\s+([^.\n]+)/i,
    /(?:to|at)\s+([A-Z][^.\n]*?(?:warehouse|branch|office|plant|facility|yard))/i
  ];

  for (const pattern of destinationPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.destination = match[1].trim();
      break;
    }
  }

  // Extract payment terms
  const paymentPatterns = [
    /payment\s+(?:term|terms):\s*([^.\n]+)/i,
    /payment\s+(?:term|terms)\s+(?:is\s+)?([^.\n]+)/i,
    /(\d+\s+days?\s+credit)/i,
    /(cod|cash\s+on\s+delivery|advance|immediate)/i
  ];

  for (const pattern of paymentPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.paymentTerms = match[1].trim();
      break;
    }
  }

  // Extract additional notes/remarks
  const notesPatterns = [
    /(?:mention|note|remark)(?:s)?[:\s]+([^.\n]+)/i,
    /(?:confirmed|discussed|agreed)\s+([^.\n]+)/i,
    /(?:as\s+per|according\s+to)\s+([^.\n]+)/i
  ];

  for (const pattern of notesPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.additionalNotes = match[1].trim();
      break;
    }
  }

  // Extract GST information
  const gstPatterns = [
    /(\d+)%\s*gst/i,
    /gst\s*@?\s*(\d+)%/i,
    /\+\s*gst\s*@?\s*(\d+)%/i,
    /\+\s*(\d+)%\s*gst/i
  ];

  for (const pattern of gstPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      poData.gstPercent = parseInt(match[1]);
      break;
    }
  }

  // Determine GST type based on location patterns
  const igstKeywords = ["interstate", "igst", "different state"];
  const cgstKeywords = ["intrastate", "cgst", "sgst", "same state"];
  
  const lowerPrompt = prompt.toLowerCase();
  if (igstKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    poData.gstType = "IGST";
  } else if (cgstKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    poData.gstType = "CGST+SGST";
  }

  // Fallback for missing fields
  if (!poData.customerName) poData.customerName = "Not Specified";
  if (!poData.transport) poData.transport = "Not Specified";
  if (!poData.paymentTerms) poData.paymentTerms = "Not Specified";
  if (!poData.destination) poData.destination = "Not Specified";
  if (!poData.dispatchedThrough) poData.dispatchedThrough = poData.transport;

  return poData;
};

// Helper function to validate parsed PO data
const validatePurchaseOrder = (poData) => {
  const errors = [];
  
  if (!poData.customerName || poData.customerName === "Not Specified") {
    errors.push("Customer/Supplier name is required");
  }
  
  if (!poData.items || poData.items.length === 0) {
    errors.push("At least one item is required");
  }
  
  // Validate items
  poData.items.forEach((item, index) => {
    if (!item.description) {
      errors.push(`Item ${index + 1}: Description is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Valid quantity is required`);
    }
    if (!item.rate || item.rate <= 0) {
      errors.push(`Item ${index + 1}: Valid rate is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format PO data for display
const formatPurchaseOrderSummary = (poData) => {
  let summary = `📋 **Purchase Order Summary**\n\n`;
  summary += `**👥 Supplier:** ${poData.customerName}\n`;
  
  if (poData.items.length > 0) {
    summary += `\n**📦 Items:**\n`;
    poData.items.forEach((item, index) => {
      const amount = item.quantity * item.rate;
      summary += `${index + 1}. **${item.description}**\n`;
      summary += `   • Quantity: ${item.quantity} ${item.uom}\n`;
      summary += `   • Rate: ₹${item.rate.toLocaleString('en-IN')}\n`;
      summary += `   • Amount: ₹${amount.toLocaleString('en-IN')}\n\n`;
    });
  }
  
  if (poData.referenceNo) {
    summary += `📄 **Reference:** ${poData.referenceNo}`;
    if (poData.referenceDate) {
      summary += ` (${poData.referenceDate})`;
    }
    summary += `\n`;
  }
  
  summary += `🚚 **Transport:** ${poData.transport}\n`;
  summary += `📍 **Destination:** ${poData.destination}\n`;
  summary += `💳 **Payment Terms:** ${poData.paymentTerms}\n`;
  summary += `📊 **GST:** ${poData.gstType} @ ${poData.gstPercent}%\n`;
  
  if (poData.additionalNotes) {
    summary += `📝 **Notes:** ${poData.additionalNotes}\n`;
  }
  
  return summary;
};

module.exports = {
  isPurchaseOrderPrompt,
  parsePromptToPurchaseOrder,
  validatePurchaseOrder,
  formatPurchaseOrderSummary
}; 