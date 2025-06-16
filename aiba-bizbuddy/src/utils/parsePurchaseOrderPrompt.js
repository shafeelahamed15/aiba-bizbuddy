/**
 * Purchase Order Prompt Parser
 * Extracts structured data from long-form natural language purchase order requests
 */

/**
 * Extract supplier name from prompt
 */
function extractSupplierName(prompt) {
  const patterns = [
    /(?:purchase order|po|order)\s+(?:to|from)\s+([^,\n]+?)(?:,|\s+for|\s+\w+\d)/i,
    /(?:supplier|vendor):\s*([^,\n]+)/i,
    /(?:to|from)\s+([A-Z][^,\n]*?)\s*(?:,|for|\s+Chennai|\s+Mumbai|\s+Delhi)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract supplier location from prompt
 */
function extractSupplierLocation(prompt) {
  const patterns = [
    /,\s*(Chennai|Mumbai|Delhi|Bangalore|Hyderabad|Kolkata|Pune|Ahmedabad|Surat|Jaipur|Lucknow|Kanpur|Nagpur|Indore|Thane|Bhopal|Visakhapatnam|Pimpri|Patna|Vadodara|Ghaziabad|Ludhiana|Agra|Nashik|Faridabad|Meerut|Rajkot|Kalyan|Vasai|Varanasi|Srinagar|Aurangabad|Dhanbad|Amritsar|Navi Mumbai|Allahabad|Ranchi|Howrah|Coimbatore|Jabalpur|Gwalior|Vijayawada|Jodhpur|Madurai|Raipur|Kota|Guwahati|Chandigarh|Solapur|Hubballi|Tiruchirappalli|Bareilly|Moradabad|Mysore|Tiruppur|Gurgaon|Aligarh|Jalandhar|Bhubaneswar|Salem|Mira|Warangal|Guntur|Bhiwandi|Saharanpur|Gorakhpur|Bikaner|Amravati|Noida|Jamshedpur|Bhilai|Cuttack|Firozabad|Kochi|Nellore|Bhavnagar|Dehradun|Durgapur|Asansol|Rourkela|Nanded|Kolhapur|Ajmer|Akola|Gulbarga|Jamnagar|Ujjain|Loni|Siliguri|Jhansi|Ulhasnagar|Jammu|Sangli|Mangalore|Erode|Belgaum|Ambattur|Tirunelveli|Malegaon|Gaya|Jalgaon|Udaipur|Maheshtala)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:,|$|\s+for)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract items from prompt with enhanced parsing
 */
function extractItemList(prompt) {
  const items = [];
  
  // Enhanced patterns for different item formats
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
      const amount = parsedQuantity * parsedRate;

      items.push({
        description: description.trim(),
        quantity: quantity.toString(),
        unit: unit.toLowerCase(),
        rate: parsedRate,
        amount: amount
      });
    }
  }

  return items;
}

/**
 * Extract reference number and date from prompt
 */
function extractReferenceInfo(prompt) {
  const refPatterns = [
    /reference\s+(?:no|number)\.?\s*(?:is\s+)?([A-Z0-9]+)(?:\s+dated\s+(\d{2}-\d{2}-\d{4}))?/i,
    /ref\.?\s*(?:no|number)?\.?\s*(?:is\s+)?([A-Z0-9]+)(?:\s+dated\s+(\d{2}-\d{2}-\d{4}))?/i,
    /reference:\s*([A-Z0-9]+)(?:\s+dated?\s+(\d{2}-\d{2}-\d{4}))?/i
  ];

  for (const pattern of refPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      return {
        referenceNumber: match[1] || '',
        referenceDate: match[2] || ''
      };
    }
  }

  return { referenceNumber: '', referenceDate: '' };
}

/**
 * Extract dispatch method from prompt
 */
function extractDispatchMethod(prompt) {
  const patterns = [
    /dispatch\s+(?:through|via|by)\s+([^.\n]+)/i,
    /(?:via|by|through)\s+(lorry|truck|transport|courier|ship|air|rail|road)/i,
    /transport\s+(?:mode|method):\s*([^.\n]+)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract destination from prompt
 */
function extractDestination(prompt) {
  const patterns = [
    /destination:\s*([^.\n]+)/i,
    /ship\s+to\s+(?:our\s+)?([^.\n]+?)(?:\s+branch|\s+warehouse|\.)/i,
    /deliver\s+to\s+([^.\n]+)/i,
    /(?:to|at)\s+([A-Z][^.\n]*?(?:warehouse|branch|office|plant|facility))/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract payment terms from prompt
 */
function extractPaymentTerms(prompt) {
  const patterns = [
    /payment\s+(?:term|terms):\s*([^.\n]+)/i,
    /payment\s+(?:term|terms)\s+(?:is\s+)?([^.\n]+)/i,
    /(\d+\s+days?\s+credit)/i,
    /(cod|cash\s+on\s+delivery|advance|immediate)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract additional notes/remarks from prompt
 */
function extractRemarks(prompt) {
  const patterns = [
    /(?:mention|note|remark)(?:s)?[:\s]+([^.\n]+)/i,
    /(?:confirmed|discussed|agreed)\s+([^.\n]+)/i,
    /(?:as\s+per|according\s+to)\s+([^.\n]+)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

/**
 * Extract GST rate from prompt
 */
function extractGSTRate(prompt) {
  const patterns = [
    /(\d+)%\s*gst/i,
    /gst\s*@?\s*(\d+)%/i,
    /\+\s*gst\s*@?\s*(\d+)%/i,
    /\+\s*(\d+)%\s*gst/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return 18; // Default GST rate
}

/**
 * Main parsing function - combines all extraction methods
 */
export function parsePurchaseOrderPrompt(prompt) {
  console.log('🔍 Parsing long-form PO prompt:', prompt);

  const referenceInfo = extractReferenceInfo(prompt);
  const items = extractItemList(prompt);
  
  const parsed = {
    supplierName: extractSupplierName(prompt),
    supplierLocation: extractSupplierLocation(prompt),
    items: items,
    referenceNumber: referenceInfo.referenceNumber,
    referenceDate: referenceInfo.referenceDate,
    dispatchThrough: extractDispatchMethod(prompt),
    destination: extractDestination(prompt),
    paymentTerms: extractPaymentTerms(prompt),
    remarks: extractRemarks(prompt),
    gstRate: extractGSTRate(prompt)
  };

  console.log('✅ Parsed PO data:', parsed);
  return parsed;
}

/**
 * OpenAI-enhanced parsing for complex prompts
 */
export async function parseWithOpenAI(prompt, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a purchase order data extraction expert. Extract structured data from the given purchase order prompt and return it as valid JSON.

Required format:
{
  "supplierName": "string",
  "supplierLocation": "string",
  "items": [
    {
      "description": "string",
      "quantity": "string", 
      "unit": "string",
      "rate": number,
      "amount": number
    }
  ],
  "referenceNumber": "string",
  "referenceDate": "string",
  "dispatchThrough": "string",
  "destination": "string", 
  "paymentTerms": "string",
  "remarks": "string",
  "gstRate": number
}

Extract all available information. Use empty strings for missing text fields and 18 for default GST rate.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedData = JSON.parse(data.choices[0].message.content);
    
    console.log('🤖 OpenAI extracted PO data:', extractedData);
    return extractedData;
    
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    // Fallback to regex parsing
    return parsePurchaseOrderPrompt(prompt);
  }
}

/**
 * Detect if prompt is a long-form purchase order request
 */
export function isLongFormPOPrompt(prompt) {
  const indicators = [
    /create\s+(?:a\s+)?purchase\s+order/i,
    /purchase\s+order\s+(?:to|for)/i,
    /po\s+(?:to|for)/i,
    /order.*(?:@|₹).*\d+/i,
    /\d+\s*(?:nos|pcs|mt|kg).*@.*₹?\d+/i
  ];

  return indicators.some(pattern => pattern.test(prompt));
}

/**
 * Generate confirmation summary for parsed data
 */
export function generatePOConfirmation(parsedData) {
  const { 
    supplierName, 
    supplierLocation, 
    items, 
    referenceNumber, 
    referenceDate,
    dispatchThrough,
    destination,
    paymentTerms,
    remarks,
    gstRate 
  } = parsedData;

  let summary = '✅ **Purchase Order Draft Created:**\n\n';
  
  // Supplier info
  summary += `**📍 Supplier**: ${supplierName}`;
  if (supplierLocation) {
    summary += `, ${supplierLocation}`;
  }
  summary += '\n\n';

  // Items
  if (items && items.length > 0) {
    summary += '**📦 Items:**\n';
    items.forEach((item, index) => {
      const totalAmount = item.amount || (item.quantity * item.rate);
      summary += `${index + 1}. **${item.description}**\n`;
      summary += `   • Quantity: ${item.quantity} ${item.unit}\n`;
      summary += `   • Rate: ₹${item.rate.toLocaleString('en-IN')}\n`;
      summary += `   • Amount: ₹${totalAmount.toLocaleString('en-IN')}\n\n`;
    });
  }

  // Additional details
  if (referenceNumber) {
    summary += `📄 **Reference**: ${referenceNumber}`;
    if (referenceDate) {
      summary += ` dated ${referenceDate}`;
    }
    summary += '\n';
  }

  if (dispatchThrough) {
    summary += `🚚 **Dispatch**: via ${dispatchThrough}\n`;
  }

  if (destination) {
    summary += `📌 **Destination**: ${destination}\n`;
  }

  if (paymentTerms) {
    summary += `💳 **Payment Terms**: ${paymentTerms}\n`;
  }

  if (remarks) {
    summary += `🗒️ **Note**: ${remarks}\n`;
  }

  summary += `\n📊 **GST Rate**: ${gstRate}%\n\n`;
  summary += '**➡️ Generate PDF?**\n\n';
  summary += '✅ **Confirm & Generate** | ✏️ **Edit Details**';

  return summary;
}

export default {
  parsePurchaseOrderPrompt,
  parseWithOpenAI,
  isLongFormPOPrompt,
  generatePOConfirmation
}; 