/**
 * Quotation Intent Handler
 * Handles all quotation-related requests: create quotes, price estimates, steel product quotes
 */

import { parseQuotationPrompt } from '../utils/parseQuotationInput';
import { validateCriticalFields } from '../utils/validateQuotationInput';
import { createQuotationChecklist, formatStepPrompt } from '../utils/quotationChecklist';

/**
 * Detect if a message is requesting steel estimation
 */
function detectSteelEstimationRequest(prompt) {
  const steelKeywords = [
    'ISMB', 'RSJ', 'ISMC', 'ISA', 'HR SHEET', 'CR SHEET', 'MS PIPE', 'MS SQUARE', 'MS RECT', 'MS FLAT', 'MS ROUND',
    'steel', 'quotation', 'estimate', 'rate', 'nos', '@', '+GST', 'To ', 'customer'
  ];
  
  const hasSteel = steelKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const hasQuantityRate = /\d+\s*nos?\s*@\s*\d+/i.test(prompt);
  const hasCustomer = /to\s+[^,\n]+,/i.test(prompt);
  
  return hasSteel && (hasQuantityRate || hasCustomer);
}

/**
 * Main quotation handler function
 * Routes different types of quotation requests to appropriate handlers
 */
export async function handleQuotation(message, context = {}) {
  console.log('🎯 Quotation handler processing:', message);

  try {
    // Check if this is a steel estimation request (with construction calculations)
    if (detectSteelEstimationRequest(message)) {
      return await handleSteelEstimation(message, context);
    }

    // Check for explicit quotation creation commands
    if (isQuotationCreationCommand(message)) {
      return await handleQuotationCreation(message, context);
    }

    // Try to parse as direct quotation request
    const parsedData = await parseDirectQuotationRequest(message, context);
    if (parsedData) {
      return parsedData;
    }

    // Fallback to guided quotation flow
    return await initiateGuidedQuotationFlow(message, context);

  } catch (error) {
    console.error('Error in quotation handler:', error);
    return {
      success: false,
      response: "I encountered an error while processing your quotation request. Please try again or break down your request into smaller parts.",
      requiresProcessing: false,
      showPDFButtons: false
    };
  }
}

/**
 * Detect if message is a quotation creation command
 */
function isQuotationCreationCommand(message) {
  const creationCommands = [
    'create quote', 'create quotation', 'generate quotation', 
    'new quotation', 'start quotation', 'make quote'
  ];
  
  const text = message.toLowerCase();
  return creationCommands.some(command => text.includes(command));
}

/**
 * Handle steel estimation requests (for construction projects)
 */
async function handleSteelEstimation(message, context) {
  // For now, delegate steel estimation to the existing system in ChatBot
  // This prevents circular imports while maintaining functionality
  return {
    success: true,
    response: null,
    requiresProcessing: true,
    processingType: 'steel_estimation',
    showPDFButtons: false,
    originalMessage: message
  };
}

/**
 * Handle explicit quotation creation commands
 */
async function handleQuotationCreation(message, context) {
  return {
    success: true,
    response: null, // Will trigger smart customer selection
    requiresProcessing: true,
    processingType: "quotation_create",
    showPDFButtons: false
  };
}

/**
 * Try to parse direct quotation requests
 */
async function parseDirectQuotationRequest(message, context) {
  try {
    // Use our new prompt parser
    const promptParser = await import('../utils/promptParser');
    const parsedData = promptParser.default.parsePromptToQuote(message);
    
    if (parsedData && parsedData.customerName && parsedData.customerName !== "Not specified" && parsedData.products && parsedData.products.length > 0) {
      // Convert to standard format
      const quotationData = convertToQuotationFormat(parsedData);
      
      // Validate critical fields
      const validation = validateCriticalFields(quotationData);
      
      if (validation.canProceed) {
        const summary = generateQuotationSummary(validation.updatedData);
        
        return {
          success: true,
          response: `📄 **Quotation Ready for ${validation.updatedData.customerName}**\n\n${summary}\n\n🔘 Ready to generate PDF?`,
          requiresProcessing: false,
          showPDFButtons: true,
          quotationData: validation.updatedData
        };
      } else {
        return {
          success: false,
          response: `🔎 I need some critical information to proceed: ${validation.missingCritical.join(", ")}\n\nPlease provide these essential details.`,
          requiresProcessing: false,
          showPDFButtons: false
        };
      }
    }
    
    return null; // No valid direct parsing
    
  } catch (error) {
    console.error('Direct quotation parsing error:', error);
    return null;
  }
}

/**
 * Initiate guided quotation flow using checklist system
 */
async function initiateGuidedQuotationFlow(message, context) {
  // Create new quotation checklist
  const checklist = createQuotationChecklist();
  const currentStep = checklist.getCurrentStep();
  
  if (!currentStep) {
    return {
      success: false,
      response: "Error initializing quotation checklist.",
      requiresProcessing: false,
      showPDFButtons: false
    };
  }

  return {
    success: true,
    response: `📋 **Let's create your quotation step by step!**\n\n**Step ${currentStep.stepIndex}/${currentStep.totalSteps}: ${currentStep.title}**\n\n${formatStepPrompt(currentStep)}`,
    requiresProcessing: true,
    processingType: "checklist_quotation",
    showPDFButtons: false,
    checklistData: {
      checklist: checklist,
      currentStep: currentStep
    },
    originalPrompt: message
  };
}

/**
 * Convert parsed data to standard quotation format
 */
function convertToQuotationFormat(extractedData) {
  return {
    customerName: extractedData.customerName || '',
    customerAddress: extractedData.customerAddress || '',
    customerGSTIN: extractedData.customerGSTIN || '',
    products: (extractedData.products || extractedData.items || []).map(item => ({
      description: item.description || '',
      qty: parseFloat(item.qty) || parseFloat(item.quantity) || 0,
      uom: item.uom || 'Nos',
      rate: parseFloat(item.rate) || 0,
      amount: parseFloat(item.amount) || (parseFloat(item.qty || item.quantity) * parseFloat(item.rate))
    })),
    gst: parseFloat(extractedData.gst) || 18,
    transport: extractedData.transport || 'Included',
    loadingCharges: extractedData.loadingCharges || 'Rs.250 per MT extra',
    paymentTerms: extractedData.paymentTerms || '',
    deliveryTerms: extractedData.deliveryTerms || '',
    priceValidity: extractedData.priceValidity || '7 days'
  };
}

/**
 * Generate quotation summary for display
 */
function generateQuotationSummary(quotationData) {
  const { products, gst, transport, loadingCharges } = quotationData;
  
  let summary = "**Products:**\n";
  let subtotal = 0;
  
  (products || []).forEach((product, index) => {
    const uom = product.uom || 'Nos';
    summary += `${index + 1}. ${product.description} - ${product.qty} ${uom} @ ₹${product.rate}/${uom} = ₹${product.amount.toLocaleString()}\n`;
    subtotal += product.amount;
  });
  
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;
  
  summary += `\n**Subtotal:** ₹${subtotal.toLocaleString()}\n`;
  summary += `**GST (${gst}%):** ₹${gstAmount.toLocaleString()}\n`;
  summary += `**Total:** ₹${total.toLocaleString()}\n\n`;
  summary += `**Transport:** ${transport}\n`;
  summary += `**Loading:** ${loadingCharges}`;
  
  return summary;
}

/**
 * Handle specific quotation sub-intents
 */
export function getQuotationSubIntent(message) {
  const text = message.toLowerCase();
  
  if (text.includes('create') || text.includes('new') || text.includes('generate')) {
    return 'create_quotation';
  }
  
  if (text.includes('estimate') || text.includes('estimation')) {
    return 'steel_estimation';
  }
  
  if (text.includes('price') || text.includes('rate') || text.includes('cost')) {
    return 'price_inquiry';
  }
  
  return 'general_quotation';
}

/**
 * Validate quotation message requirements
 */
export function validateQuotationRequest(message) {
  const hasCustomer = /to\s+[a-zA-Z\s]+/i.test(message);
  const hasProduct = /(tmt|ismb|ismc|steel|iron|sheet|pipe|bar)/i.test(message);
  const hasQuantity = /\d+\s?(mt|kg|ton|nos|pcs)/i.test(message);
  const hasPrice = /@\s?[\d.]+|\₹\s?[\d.,]+/.test(message);
  
  return {
    hasCustomer,
    hasProduct,
    hasQuantity,
    hasPrice,
    completeness: [hasCustomer, hasProduct, hasQuantity, hasPrice].filter(Boolean).length / 4
  };
} 