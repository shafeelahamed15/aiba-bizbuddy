/**
 * Edit Intent Handler
 * Handles all edit-related requests: change names, update prices, add/remove items, modify quotations
 */

/**
 * Main edit handler function
 * Routes different types of edit requests to appropriate handlers
 */
export async function handleEdit(message, context = {}) {
  console.log('✏️ Edit handler processing:', message);

  try {
    // Parse the edit command to understand what needs to be changed
    const editCommand = parseEditCommand(message);
    
    if (editCommand.type === 'unknown') {
      return await handleUnknownEditRequest(message, context);
    }

    // Route to specific edit handlers based on type
    switch (editCommand.type) {
      case 'customer':
        return await handleCustomerEdit(editCommand, context);
      
      case 'product':
        return await handleProductEdit(editCommand, context);
      
      case 'terms':
        return await handleTermsEdit(editCommand, context);
      
      case 'meta':
        return await handleMetaEdit(editCommand, context);
      
      default:
        return await handleGenericEdit(editCommand, context);
    }

  } catch (error) {
    console.error('Error in edit handler:', error);
    return {
      success: false,
      response: "I encountered an error while processing your edit request. Please try again with a clearer instruction.",
      requiresProcessing: false
    };
  }
}

/**
 * Parse edit commands to extract intent and parameters
 */
function parseEditCommand(command) {
  const text = command.toLowerCase().trim();
  
  console.log('🛠️ Parsing edit command:', text);
  
  // Customer details updates
  if (text.includes('change') && (text.includes('customer') || text.includes('name'))) {
    const nameMatch = text.match(/change\s+(?:customer\s+)?name\s+to\s+(.+)$/i) ||
                     text.match(/change\s+customer\s+(?:to\s+)?(.+)$/i);
    if (nameMatch) {
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    }
  }
  
  if ((text.includes('update') || text.includes('set')) && text.includes('customer')) {
    const nameMatch = text.match(/(?:update|set)\s+customer\s+(?:name\s+)?(?:to\s+)?(.+)$/i);
    if (nameMatch) {
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    }
  }

  if (text.includes('address')) {
    const addressMatch = text.match(/(?:change|update|set)\s+address\s+(?:to\s+)?(.+)$/i);
    if (addressMatch) {
      return {
        type: 'customer',
        action: 'update_address',
        value: addressMatch[1].trim()
      };
    }
  }

  if (text.includes('gstin')) {
    const gstinMatch = text.match(/(?:change|update|set)\s+gstin\s+(?:to\s+)?([^\s,\n]+)/i);
    if (gstinMatch) {
      return {
        type: 'customer',
        action: 'update_gstin',
        value: gstinMatch[1].trim()
      };
    }
  }

  // Product modifications
  if (text.includes('add') && (text.includes('item') || text.includes('product'))) {
    // Pattern: "Add item: TMT 10mm 5MT @ ₹55"
    let itemMatch = text.match(/add.*?(?:item|product)?:?\s*([^@]+)\s*@\s*([\d.]+)/i);
    
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const rate = parseFloat(itemMatch[2]);
      
      // Extract quantity
      const qtyMatch = description.match(/([\d.]+)\s*(?:MT|kg|nos)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) * (description.toLowerCase().includes('mt') ? 1000 : 1) : 1000;
      
      return {
        type: 'product',
        action: 'add',
        value: {
          description: description.replace(/\s*-?\s*[\d.]+\s*(?:MT|kg|nos)/i, '').trim(),
          qty,
          rate,
          amount: qty * rate
        }
      };
    }

    // Pattern without rate: "add item TMT 10mm"
    itemMatch = text.match(/add.*?(?:item\s+)?(.+)$/i);
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const qtyMatch = description.match(/([\d.]+)\s*(?:MT|kg|nos)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) * (description.toLowerCase().includes('mt') ? 1000 : 1) : 5000;
      
      return {
        type: 'product',
        action: 'add',
        value: {
          description: description,
          qty,
          rate: 55, // Default rate
          amount: qty * 55
        }
      };
    }
  }

  if (text.includes('remove') && (text.includes('last') || text.includes('item') || text.includes('product'))) {
    return {
      type: 'product',
      action: 'remove_last'
    };
  }

  if (text.includes('update') && text.includes('price')) {
    const priceMatch = text.match(/update\s+price\s+of\s+(.+?)\s+to\s+[\₹]?([\d.]+)/i);
    if (priceMatch) {
      return {
        type: 'product',
        action: 'update_price',
        description: priceMatch[1].trim(),
        value: parseFloat(priceMatch[2])
      };
    }
  }

  // Terms and charges updates
  if (text.includes('gst') && (text.includes('update') || text.includes('change') || text.includes('set'))) {
    const gstMatch = text.match(/(?:update|set|change)\s+gst\s+(?:to\s+)?([\d.]+)%?/i);
    if (gstMatch) {
      return {
        type: 'terms',
        action: 'update_gst',
        value: parseFloat(gstMatch[1])
      };
    }
  }

  if (text.includes('loading')) {
    const loadingMatch = text.match(/(?:add|set|change|update)\s+loading\s+charges?\s+(?:to\s+)?(.+)$/i);
    if (loadingMatch) {
      return {
        type: 'terms',
        action: 'update_loading',
        value: loadingMatch[1].trim()
      };
    }
  }

  if (text.includes('transport')) {
    const transportMatch = text.match(/(?:change|set|update)\s+transport\s+(?:to\s+)?(.+)$/i);
    if (transportMatch) {
      return {
        type: 'terms',
        action: 'update_transport',
        value: transportMatch[1].trim()
      };
    }
  }

  // Meta commands
  if ((text.includes('show') || text.includes('display')) && (text.includes('draft') || text.includes('current'))) {
    return {
      type: 'meta',
      action: 'show_draft'
    };
  }

  if (text.includes('reset') || text.includes('clear')) {
    return {
      type: 'meta',
      action: 'reset'
    };
  }

  if (text.includes('done') || text.includes('finished') || text.includes('complete')) {
    return {
      type: 'meta',
      action: 'finalize'
    };
  }

  return {
    type: 'unknown',
    action: 'unknown',
    originalCommand: command
  };
}

/**
 * Handle customer-related edits
 */
async function handleCustomerEdit(editCommand, context) {
  const { action, value } = editCommand;
  
  switch (action) {
    case 'update_name':
      return {
        success: true,
        response: `✅ Customer name updated to: **${value}**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'customer', field: 'name', value }
      };
      
    case 'update_address':
      return {
        success: true,
        response: `✅ Customer address updated to: **${value}**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'customer', field: 'address', value }
      };
      
    case 'update_gstin':
      return {
        success: true,
        response: `✅ Customer GSTIN updated to: **${value}**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'customer', field: 'gstin', value }
      };
      
    case 'request_name':
      return {
        success: true,
        response: "What would you like to change the customer name to?",
        requiresProcessing: false
      };
      
    default:
      return {
        success: false,
        response: "I couldn't understand the customer edit request. Please be more specific.",
        requiresProcessing: false
      };
  }
}

/**
 * Handle product-related edits
 */
async function handleProductEdit(editCommand, context) {
  const { action, value, description } = editCommand;
  
  switch (action) {
    case 'add':
      return {
        success: true,
        response: `✅ Added product: **${value.description}** - ${value.qty}kg @ ₹${value.rate}/kg = ₹${value.amount}`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'product', action: 'add', product: value }
      };
      
    case 'remove_last':
      return {
        success: true,
        response: "✅ Removed the last product from the quotation",
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'product', action: 'remove_last' }
      };
      
    case 'update_price':
      return {
        success: true,
        response: `✅ Updated price of **${description}** to ₹${value}/kg`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'product', action: 'update_price', description, rate: value }
      };
      
    default:
      return {
        success: false,
        response: "I couldn't understand the product edit request. Please be more specific.",
        requiresProcessing: false
      };
  }
}

/**
 * Handle terms and charges edits
 */
async function handleTermsEdit(editCommand, context) {
  const { action, value } = editCommand;
  
  switch (action) {
    case 'update_gst':
      return {
        success: true,
        response: `✅ GST updated to: **${value}%**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'terms', field: 'gst', value }
      };
      
    case 'update_loading':
      return {
        success: true,
        response: `✅ Loading charges updated to: **${value}**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'terms', field: 'loadingCharges', value }
      };
      
    case 'update_transport':
      return {
        success: true,
        response: `✅ Transport updated to: **${value}**`,
        requiresProcessing: true,
        processingType: 'apply_edit',
        editData: { type: 'terms', field: 'transport', value }
      };
      
    default:
      return {
        success: false,
        response: "I couldn't understand the terms edit request. Please specify what you want to change.",
        requiresProcessing: false
      };
  }
}

/**
 * Handle meta commands (show, reset, finalize)
 */
async function handleMetaEdit(editCommand, context) {
  const { action } = editCommand;
  
  switch (action) {
    case 'show_draft':
      return {
        success: true,
        response: "Here's your current quotation draft:",
        requiresProcessing: true,
        processingType: 'show_draft'
      };
      
    case 'reset':
      return {
        success: true,
        response: "✅ Quotation data has been reset. You can start fresh now.",
        requiresProcessing: true,
        processingType: 'reset_quotation'
      };
      
    case 'finalize':
      return {
        success: true,
        response: "🎯 Ready to finalize! Should I generate the PDF quotation?",
        requiresProcessing: true,
        processingType: 'finalize_quotation'
      };
      
    default:
      return {
        success: false,
        response: "I couldn't understand the command. Try 'show draft', 'reset', or 'done'.",
        requiresProcessing: false
      };
  }
}

/**
 * Handle unknown edit requests with suggestions
 */
async function handleUnknownEditRequest(message, context) {
  return {
    success: false,
    response: `I couldn't understand what you want to edit. Here are some examples:

**Customer Changes:**
• "Change customer name to ABC Company"
• "Update address to New Delhi"
• "Set GSTIN to 07ABCDE1234F1Z5"

**Product Changes:**
• "Add item TMT 10mm 5MT @ ₹55"
• "Remove last item"
• "Update price of TMT to ₹60"

**Terms Changes:**
• "Change GST to 12%"
• "Set transport to Extra"
• "Update loading charges to ₹300 per MT"

What would you like to edit?`,
    requiresProcessing: false
  };
}

/**
 * Handle generic edit requests
 */
async function handleGenericEdit(editCommand, context) {
  return {
    success: false,
    response: "I understand you want to make changes, but could you be more specific? What exactly would you like to edit?",
    requiresProcessing: false
  };
}

/**
 * Validate if message is an edit-related request
 */
export function validateEditRequest(message) {
  const editKeywords = [
    'change', 'update', 'edit', 'modify', 'add', 'remove', 'delete',
    'set', 'fix', 'correct', 'replace', 'alter'
  ];
  
  const text = message.toLowerCase();
  const hasEditKeyword = editKeywords.some(keyword => text.includes(keyword));
  const hasTarget = text.includes('name') || text.includes('price') || text.includes('item') || 
                   text.includes('customer') || text.includes('gst') || text.includes('address');
  
  return {
    isEdit: hasEditKeyword && hasTarget,
    confidence: hasEditKeyword ? (hasTarget ? 0.9 : 0.5) : 0,
    suggestedAction: hasEditKeyword ? 'edit' : null
  };
}

/**
 * Get edit sub-intent for routing
 */
export function getEditSubIntent(message) {
  const text = message.toLowerCase();
  
  if (text.includes('customer') || text.includes('name') || text.includes('address')) {
    return 'customer_edit';
  }
  
  if (text.includes('product') || text.includes('item') || text.includes('add') || text.includes('remove')) {
    return 'product_edit';
  }
  
  if (text.includes('gst') || text.includes('transport') || text.includes('loading')) {
    return 'terms_edit';
  }
  
  if (text.includes('show') || text.includes('reset') || text.includes('done')) {
    return 'meta_edit';
  }
  
  return 'general_edit';
} 