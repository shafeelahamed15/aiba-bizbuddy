/**
 * Intent Router
 * Routes classified intents to appropriate modular handlers
 */

import { classifyIntent } from './intentClassifier.js';
import { handleQuotation } from '../intents/handleQuotation.js';
import { handleEdit } from '../intents/handleEdit.js';
import { handleCasualChat } from '../intents/handleCasualChat.js';

/**
 * Enhanced Intent Detection from User Prompt
 * Scans for specific trigger keywords to identify quotation vs purchase order requests
 */
export function detectIntentFromPrompt(prompt) {
  const lower = prompt.toLowerCase();

  // Purchase Order Detection
  if (
    lower.includes("purchase order") ||
    lower.includes("create po") ||
    lower.includes("generate po") ||
    lower.includes("make po") ||
    lower.includes("order to") ||
    lower.includes("raise po") ||
    lower.includes("send po") ||
    lower.includes("new po") ||
    lower.includes("po for") ||
    lower.includes("purchase order for")
  ) {
    return "purchase_order";
  }

  // Quotation Detection
  if (
    lower.includes("quotation") ||
    lower.includes("quote") ||
    lower.includes("generate quotation") ||
    lower.includes("send quote") ||
    lower.includes("create quotation") ||
    lower.includes("quote for") ||
    lower.includes("quotation for") ||
    lower.includes("price quote") ||
    lower.includes("estimate")
  ) {
    return "quotation";
  }

  return "unknown";
}

/**
 * Main router function - coordinates intent classification and handling
 * This is the entry point for all chatbot message processing
 */
export async function routeIntent(message, context = {}) {
  console.log('🎯 Intent Router processing:', message);

  try {
    // Step 1: First check for specific quotation/PO intent detection
    const specificIntent = detectIntentFromPrompt(message);
    console.log(`🔍 Specific intent detected: ${specificIntent}`);

    let intent;
    let enrichedContext;

    // Step 2: Handle specific intents or fallback to general classification
    if (specificIntent === "purchase_order") {
      intent = "purchase_order_intent";
      enrichedContext = {
        ...context,
        detectedIntent: intent,
        specificFlow: "purchase_order",
        timestamp: new Date().toISOString()
      };
    } else if (specificIntent === "quotation") {
      intent = "quotation_intent";
      enrichedContext = {
        ...context,
        detectedIntent: intent,
        specificFlow: "quotation",
        timestamp: new Date().toISOString()
      };
    } else {
      // Fallback to general intent classification
      intent = await classifyIntent(message);
      console.log(`🏷️ General classification: ${intent}`);
      
      enrichedContext = {
        ...context,
        detectedIntent: intent,
        timestamp: new Date().toISOString()
      };
    }

    // Step 3: Route to appropriate handler based on intent
    let result;
    
    switch (intent) {
      case 'purchase_order_intent':
        result = await handlePurchaseOrderIntent(message, enrichedContext);
        break;
        
      case 'quotation_intent':
        result = await handleQuotation(message, enrichedContext);
        break;
      
      case 'edit_intent':
        result = await handleEdit(message, enrichedContext);
        break;
      
      case 'casual_intent':
        result = await handleCasualChat(message, enrichedContext);
        break;
      
      default:
        // Fallback for unknown intents
        result = await handleUnknownIntent(message, enrichedContext);
    }

    // Step 4: Enrich result with routing metadata
    return {
      ...result,
      intent,
      routingMetadata: {
        classifiedAs: intent,
        specificIntent: specificIntent,
        handledBy: getHandlerName(intent),
        confidence: await getIntentConfidence(message),
        timestamp: enrichedContext.timestamp
      }
    };

  } catch (error) {
    console.error('Intent routing error:', error);
    
    // Graceful fallback
    return {
      success: false,
      response: "I encountered an issue processing your request. Could you please rephrase or try again?",
      requiresProcessing: false,
      intent: 'error',
      error: error.message
    };
  }
}

/**
 * Handle Purchase Order Intent
 * Routes to purchase order creation flow
 */
async function handlePurchaseOrderIntent(message, context) {
  console.log('🛒 Handling Purchase Order intent:', message);
  
  return {
    success: true,
    response: null, // Will be handled by purchase order flow in ChatBot component
    requiresProcessing: true,
    processingType: "purchase_order_create",
    intent: "purchase_order_intent",
    flowType: "purchase_order",
    metadata: {
      triggerMessage: message,
      detectedKeywords: extractPOKeywords(message),
      timestamp: context.timestamp
    }
  };
}

/**
 * Extract Purchase Order related keywords for metadata
 */
function extractPOKeywords(message) {
  const lower = message.toLowerCase();
  const poKeywords = [
    "purchase order", "create po", "generate po", "make po", 
    "order to", "raise po", "send po", "new po", "po for"
  ];
  
  return poKeywords.filter(keyword => lower.includes(keyword));
}

/**
 * Handle unknown or unclassified intents
 */
async function handleUnknownIntent(message, context) {
  console.log('❓ Handling unknown intent:', message);
  
  // Try to provide helpful suggestions based on message content
  const suggestions = generateIntentSuggestions(message);
  
  return {
    success: false,
    response: `I'm not sure how to help with that. Here are some things I can do:

${suggestions}

Could you rephrase your request or try one of the examples above?`,
    requiresProcessing: false,
    showFeatures: true
  };
}

/**
 * Generate helpful suggestions for unknown intents
 */
function generateIntentSuggestions(message) {
  const text = message.toLowerCase();
  
  // If message contains steel-related keywords, suggest quotation
  if (containsSteelKeywords(text)) {
    return `🎯 **For Steel Quotations:**
• "Create quote for 5MT TMT bars to ABC Company"
• "Quote for ISMB 150 - 3MT @ ₹58/kg"
• "Generate quotation for Swastik Industries"

📝 **For Editing:**
• "Change customer name to XYZ Corp"
• "Add item TMT 10mm 2MT @ ₹55/kg"
• "Update GST to 12%"`;
  }
  
  // If message contains question words, suggest knowledge queries
  if (containsQuestionWords(text)) {
    return `📚 **Ask Questions:**
• "What's the difference between TMT and MS bars?"
• "How to calculate steel for construction?"
• "Current steel market rates"

🎯 **Create Quotations:**
• "Quote for 5MT steel to ABC Company"
• "Create quotation for existing customer"`;
  }
  
  // Default suggestions
  return `🎯 **Create Quotations:**
• "Create quote for [customer]"
• "Quote for 5MT TMT to ABC Company"

📝 **Edit Quotations:**
• "Change customer name to XYZ"
• "Add item TMT 10mm 5MT @ ₹55"

💬 **Ask Questions:**
• "What can you do?"
• "Help with steel products"`;
}

/**
 * Check if message contains steel-related keywords
 */
function containsSteelKeywords(text) {
  const steelKeywords = [
    'tmt', 'ismb', 'ismc', 'steel', 'iron', 'metal', 'rebar', 'bars',
    'sheets', 'plates', 'pipe', 'angle', 'channel', 'beam'
  ];
  
  return steelKeywords.some(keyword => text.includes(keyword));
}

/**
 * Check if message contains question words
 */
function containsQuestionWords(text) {
  const questionWords = [
    'what', 'how', 'when', 'where', 'why', 'which', 'who',
    'difference', 'compare', 'explain', 'tell me'
  ];
  
  return questionWords.some(word => text.includes(word)) || text.includes('?');
}

/**
 * Get handler name for metadata
 */
function getHandlerName(intent) {
  const handlerMap = {
    'purchase_order_intent': 'PurchaseOrderHandler',
    'quotation_intent': 'QuotationHandler',
    'edit_intent': 'EditHandler', 
    'casual_intent': 'CasualChatHandler',
    'error': 'ErrorHandler',
    'unknown': 'UnknownIntentHandler'
  };
  
  return handlerMap[intent] || 'DefaultHandler';
}

/**
 * Get intent confidence for debugging/analytics
 */
async function getIntentConfidence(message) {
  try {
    const { getIntentConfidence } = await import('./intentClassifier.js');
    return getIntentConfidence(message);
  } catch (error) {
    console.error('Error getting intent confidence:', error);
    return { error: 'confidence_unavailable' };
  }
}

/**
 * Validate context object and enrich with defaults
 */
export function validateAndEnrichContext(context = {}) {
  return {
    // User state
    userId: context.userId || null,
    sessionId: context.sessionId || generateSessionId(),
    
    // App state
    quotationActive: context.quotationActive || false,
    quotationData: context.quotationData || null,
    awaitingConfirmation: context.awaitingConfirmation || false,
    
    // Previous interactions
    lastIntent: context.lastIntent || null,
    conversationHistory: context.conversationHistory || [],
    
    // Business context
    hasRecentQuotations: context.hasRecentQuotations || false,
    hasCustomers: context.hasCustomers || false,
    
    // Metadata
    timestamp: new Date().toISOString(),
    ...context // Preserve any additional context
  };
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Check if intent requires immediate processing (blocking)
 */
export function requiresImmediateProcessing(intent, context) {
  // Edit intents usually need immediate processing to apply changes
  if (intent === 'edit_intent') {
    return true;
  }
  
  // Quotation intents that continue existing flows
  if (intent === 'quotation_intent' && context.quotationActive) {
    return true;
  }
  
  // Context-dependent casual responses
  if (intent === 'casual_intent' && (context.awaitingConfirmation || context.quotationActive)) {
    return true;
  }
  
  return false;
}

/**
 * Get suggested follow-up actions based on intent and result
 */
export function getSuggestedActions(intent, result, context) {
  const suggestions = [];
  
  if (intent === 'quotation_intent' && result.success) {
    if (result.showPDFButtons) {
      suggestions.push('Generate PDF');
      suggestions.push('Edit quotation');
    } else {
      suggestions.push('Add more products');
      suggestions.push('Set customer details');
    }
  }
  
  if (intent === 'edit_intent' && result.success) {
    suggestions.push('Show current draft');
    suggestions.push('Make more changes');
    suggestions.push('Generate PDF');
  }
  
  if (intent === 'casual_intent') {
    suggestions.push('Create quotation');
    suggestions.push('Ask about steel products');
    suggestions.push('View help');
  }
  
  return suggestions;
}

/**
 * Log intent routing for analytics and debugging
 */
export function logIntentRouting(message, intent, result, context) {
  const logData = {
    timestamp: new Date().toISOString(),
    message: message.substring(0, 100), // Truncate for privacy
    intent,
    success: result.success,
    processingType: result.processingType,
    context: {
      quotationActive: context.quotationActive,
      awaitingConfirmation: context.awaitingConfirmation
    }
  };
  
  console.log('📊 Intent Routing Log:', logData);
  
  // In production, you might want to send this to analytics service
  // analytics.track('intent_routing', logData);
  
  return logData;
} 