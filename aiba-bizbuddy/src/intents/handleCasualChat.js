/**
 * Casual Chat Intent Handler
 * Handles greetings, thanks, general questions, and conversational responses
 */

/**
 * Main casual chat handler function
 * Routes different types of casual interactions to appropriate responses
 */
export async function handleCasualChat(message, context = {}) {
  console.log('💬 Casual chat handler processing:', message);

  try {
    // Determine the type of casual interaction
    const chatType = getCasualChatType(message);
    
    // Route to specific handlers based on chat type
    switch (chatType) {
      case 'greeting':
        return handleGreeting(message, context);
      
      case 'thanks':
        return handleGratitude(message, context);
      
      case 'question_about_bot':
        return handleBotQuestions(message, context);
      
      case 'affirmation':
        return handleAffirmation(message, context);
      
      case 'negation':
        return handleNegation(message, context);
      
      case 'farewell':
        return handleFarewell(message, context);
      
      case 'help_request':
        return handleHelpRequest(message, context);
      
      default:
        return handleGeneral(message, context);
    }

  } catch (error) {
    console.error('Error in casual chat handler:', error);
    return {
      success: true,
      response: "I'm here to help with your steel business needs. What can I do for you?",
      requiresProcessing: false
    };
  }
}

/**
 * Determine the type of casual interaction
 */
function getCasualChatType(message) {
  const text = message.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hello|hey|hiya|howdy|greetings|good\s+(morning|afternoon|evening))$/i.test(text)) {
    return 'greeting';
  }
  
  // Thanks and gratitude
  if (/^(thanks?|thank\s+you|thx|ty|thankyou|appreciate|grateful)$/i.test(text)) {
    return 'thanks';
  }
  
  // Questions about the bot
  if (text.includes('what can you do') || text.includes('what do you do') || 
      text.includes('how do you work') || text.includes('what is this') ||
      text.includes('who are you') || text.includes('what are you') ||
      text.includes('help me understand')) {
    return 'question_about_bot';
  }
  
  // Affirmations
  if (/^(yes|yeah|yep|yup|sure|ok|okay|alright|fine|good|great|cool|right|correct)$/i.test(text)) {
    return 'affirmation';
  }
  
  // Negations
  if (/^(no|nope|nah|not\s+really|dont|don't|never\s+mind)$/i.test(text)) {
    return 'negation';
  }
  
  // Farewells
  if (/^(bye|goodbye|see\s+you|later|quit|exit|stop)$/i.test(text)) {
    return 'farewell';
  }
  
  // Help requests
  if (text.includes('help') || text.includes('assist') || text.includes('guide')) {
    return 'help_request';
  }
  
  return 'general';
}

/**
 * Handle greeting messages
 */
function handleGreeting(message, context) {
  const greetingResponses = [
    "Hello! 👋 I'm your AI assistant for steel trading and quotations. How can I help you today?",
    "Hi there! 😊 Ready to help with steel quotations, product information, or business queries.",
    "Hey! Great to see you. I can help create quotations, answer steel-related questions, or provide market insights.",
    "Hello! 🏗️ I'm here to assist with your steel business needs. What would you like to work on?",
    "Hi! Welcome back. I can help you create quotations, calculate steel requirements, or answer product questions.",
  ];
  
  const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
  
  return {
    success: true,
    response,
    requiresProcessing: false,
    showFeatures: true
  };
}

/**
 * Handle gratitude expressions
 */
function handleGratitude(message, context) {
  const gratitudeResponses = [
    "You're welcome! 😊 Happy to help with your steel business needs.",
    "Glad I could help! Let me know if you need anything else.",
    "My pleasure! Feel free to ask for more quotations or steel information.",
    "You're very welcome! I'm here whenever you need assistance.",
    "Happy to help! Ready for your next quotation or question.",
  ];
  
  const response = gratitudeResponses[Math.floor(Math.random() * gratitudeResponses.length)];
  
  return {
    success: true,
    response,
    requiresProcessing: false
  };
}

/**
 * Handle questions about the bot's capabilities
 */
function handleBotQuestions(message, context) {
  return {
    success: true,
    response: `I'm your AI assistant for steel trading and business operations! Here's what I can do:

🎯 **Quotation Management:**
• Create detailed steel quotations with pricing
• Calculate steel requirements for construction
• Generate professional PDF quotations
• Edit and modify existing quotations

📊 **Steel Business Support:**
• Answer questions about steel products (TMT, ISMB, sheets, etc.)
• Provide market insights and pricing guidance
• Help with product specifications and comparisons
• Calculate weights and quantities

💼 **Smart Features:**
• Natural language processing for easy interaction
• Customer database management
• Automated calculations and GST handling
• Professional document generation

Just tell me what you need! You can say things like:
• "Create quote for 5MT TMT bars to ABC Company"
• "What's the difference between TMT and MS bars?"
• "Add item ISMB 150 - 2MT @ ₹58/kg"`,
    requiresProcessing: false
  };
}

/**
 * Handle affirmative responses (yes, ok, etc.)
 */
function handleAffirmation(message, context) {
  // Context-aware responses based on current state
  if (context.awaitingConfirmation) {
    return {
      success: true,
      response: "Great! Let me proceed with that.",
      requiresProcessing: true,
      processingType: 'confirm_action'
    };
  }
  
  if (context.quotationInProgress) {
    return {
      success: true,
      response: "Perfect! Let's continue with the quotation.",
      requiresProcessing: true,
      processingType: 'continue_quotation'
    };
  }
  
  const affirmativeResponses = [
    "Great! 👍 What would you like to work on?",
    "Perfect! How can I assist you today?",
    "Awesome! Ready to help with quotations or steel questions.",
    "Excellent! What do you need help with?",
    "Sounds good! Let me know what you'd like to do.",
  ];
  
  const response = affirmativeResponses[Math.floor(Math.random() * affirmativeResponses.length)];
  
  return {
    success: true,
    response,
    requiresProcessing: false
  };
}

/**
 * Handle negative responses (no, etc.)
 */
function handleNegation(message, context) {
  // Context-aware responses
  if (context.awaitingConfirmation) {
    return {
      success: true,
      response: "No problem! What would you like to do instead?",
      requiresProcessing: true,
      processingType: 'cancel_action'
    };
  }
  
  if (context.quotationInProgress) {
    return {
      success: true,
      response: "Alright! Would you like to modify something or start over?",
      requiresProcessing: true,
      processingType: 'pause_quotation'
    };
  }
  
  return {
    success: true,
    response: "No worries! Let me know if there's anything else I can help you with.",
    requiresProcessing: false
  };
}

/**
 * Handle farewell messages
 */
function handleFarewell(message, context) {
  const farewellResponses = [
    "Goodbye! 👋 Feel free to come back anytime for steel quotations or questions.",
    "See you later! Thanks for using our steel trading assistant.",
    "Take care! I'll be here whenever you need help with quotations or steel business.",
    "Bye! Hope I was helpful with your steel business needs today.",
    "Until next time! Ready to assist you whenever you need quotations or steel info.",
  ];
  
  const response = farewellResponses[Math.floor(Math.random() * farewellResponses.length)];
  
  return {
    success: true,
    response,
    requiresProcessing: false
  };
}

/**
 * Handle help requests
 */
function handleHelpRequest(message, context) {
  return {
    success: true,
    response: `I'm here to help! 🤝 Here are some ways to get started:

**Quick Commands:**
• "Create quote for [customer]" - Start a new quotation
• "Quote for 5MT TMT to ABC Company" - Direct quotation
• "Add item TMT 10mm 3MT @ ₹55" - Add products to existing quote
• "Change customer name to XYZ" - Edit quotation details

**Questions I can answer:**
• Steel product specifications and differences
• Current market rates and pricing guidance
• Weight calculations and quantity estimates
• Technical advice for steel trading

**Examples to try:**
• "What's the difference between TMT and MS bars?"
• "Calculate steel for 2000 sq ft construction"
• "Update GST to 12%"
• "Show current quotation draft"

Just type what you need in natural language, and I'll understand!`,
    requiresProcessing: false
  };
}

/**
 * Handle general casual responses
 */
function handleGeneral(message, context) {
  // Check if it's a simple acknowledgment during a process
  if (context.quotationInProgress || context.awaitingInput) {
    return {
      success: true,
      response: "I understand. Let's continue - what's the next step?",
      requiresProcessing: false
    };
  }
  
  return {
    success: true,
    response: `I'm ready to help with your steel business needs! 🏗️

You can:
• **Create quotations** - "Quote for 5MT TMT bars to ABC Company"
• **Ask questions** - "What's the difference between ISMB and ISMC?"
• **Get help** - "What can you do?" or "Help me understand"
• **Edit quotations** - "Change customer name to XYZ Corp"

What would you like to work on today?`,
    requiresProcessing: false
  };
}

/**
 * Get casual chat sub-intent for analytics
 */
export function getCasualSubIntent(message) {
  return getCasualChatType(message);
}

/**
 * Check if message is a simple acknowledgment
 */
export function isSimpleAcknowledgment(message) {
  const simple = ['ok', 'okay', 'yes', 'no', 'thanks', 'thank you', 'hi', 'hello'];
  return simple.includes(message.toLowerCase().trim());
}

/**
 * Get contextual response based on current app state
 */
export function getContextualResponse(message, appState) {
  const chatType = getCasualChatType(message);
  
  // If user says "yes" during quotation flow
  if (chatType === 'affirmation' && appState.quotationActive) {
    return {
      success: true,
      response: "Perfect! Let's continue with the quotation.",
      requiresProcessing: true,
      processingType: 'continue_quotation'
    };
  }
  
  // If user says "no" during quotation flow
  if (chatType === 'negation' && appState.quotationActive) {
    return {
      success: true,
      response: "Alright! Would you like to make changes or start over?",
      requiresProcessing: true,
      processingType: 'pause_quotation'
    };
  }
  
  return null; // Use default casual handling
}

/**
 * Generate appropriate prompt suggestions based on context
 */
export function generatePromptSuggestions(context = {}) {
  const suggestions = [];
  
  if (context.hasRecentQuotations) {
    suggestions.push("Create another quotation");
    suggestions.push("Edit last quotation");
  }
  
  if (context.hasCustomers) {
    suggestions.push("Quote for existing customer");
  }
  
  // Always include these basic suggestions
  suggestions.push(
    "Create new quotation",
    "Ask about steel products",
    "Calculate steel requirements",
    "What can you do?"
  );
  
  return suggestions.slice(0, 4); // Return max 4 suggestions
} 