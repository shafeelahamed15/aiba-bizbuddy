/**
 * Central Chatbot State Manager
 * Manages conversation state, intent tracking, and context switching
 * Prevents state clashes and maintains conversation continuity
 */
class ChatbotStateManager {
  constructor() {
    this.state = this.getInitialState();
    this.stateHistory = [];
    this.maxHistorySize = 10;
    this.listeners = [];
  }

  /**
   * Get initial/default state
   */
  getInitialState() {
    return {
      currentIntent: "idle", // idle, quotation_intent, checklist_mode, orchestrator_mode, customer_mgmt, etc.
      quotationStep: null, // collectingCustomer, collectingItems, confirm, edit, finalize, etc.
      quotationDraft: {},
      checklistData: {},
      lastAction: "",
      isAwaitingInput: false,
      awaitingInputType: null, // customer_name, product_details, confirmation, etc.
      conversationContext: {
        lastMessage: "",
        lastResponse: "",
        userPreference: "guided" // guided, quick, hybrid
      },
      sessionData: {
        startTime: new Date().toISOString(),
        interactionCount: 0,
        completedQuotes: 0,
        currentQuoteId: null
      },
      temporaryData: {}, // For storing temporary values during conversation
      flags: {
        hasGreeted: false,
        showingHelp: false,
        inErrorState: false,
        skipValidation: false
      }
    };
  }

  /**
   * Set current intent and optionally transition state
   */
  setIntent(intent, additionalData = {}) {
    this.saveStateToHistory();
    
    this.state.currentIntent = intent;
    this.state.lastAction = `intent_changed_to_${intent}`;
    
    // Apply additional data
    Object.keys(additionalData).forEach(key => {
      if (key !== 'currentIntent') {
        this.state[key] = additionalData[key];
      }
    });

    this.notifyListeners('intent_changed', { intent, additionalData });
    return this.state;
  }

  /**
   * Update quotation step within quotation intent
   */
  setQuotationStep(step, data = {}) {
    if (this.state.currentIntent !== 'quotation_intent') {
      this.setIntent('quotation_intent');
    }

    this.saveStateToHistory();
    this.state.quotationStep = step;
    this.state.lastAction = `quotation_step_${step}`;

    // Update quotation draft data
    if (data.quotationDraft) {
      this.state.quotationDraft = { ...this.state.quotationDraft, ...data.quotationDraft };
    }

    // Update checklist data if provided
    if (data.checklistData) {
      this.state.checklistData = { ...this.state.checklistData, ...data.checklistData };
    }

    this.notifyListeners('quotation_step_changed', { step, data });
    return this.state;
  }

  /**
   * Set awaiting input state
   */
  setAwaitingInput(inputType, context = {}) {
    this.state.isAwaitingInput = true;
    this.state.awaitingInputType = inputType;
    this.state.lastAction = `awaiting_${inputType}`;
    
    // Store context for the awaiting input
    this.state.temporaryData = { ...this.state.temporaryData, ...context };

    this.notifyListeners('awaiting_input', { inputType, context });
    return this.state;
  }

  /**
   * Clear awaiting input state
   */
  clearAwaitingInput() {
    this.state.isAwaitingInput = false;
    this.state.awaitingInputType = null;
    this.state.temporaryData = {};
    
    this.notifyListeners('input_received', {});
    return this.state;
  }

  /**
   * Update quotation draft data
   */
  updateQuotationDraft(data) {
    this.state.quotationDraft = { ...this.state.quotationDraft, ...data };
    this.state.lastAction = "quotation_draft_updated";
    
    this.notifyListeners('quotation_draft_updated', { data });
    return this.state;
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get specific state property
   */
  get(property) {
    return this.state[property];
  }

  /**
   * Set specific state property
   */
  set(property, value) {
    this.saveStateToHistory();
    this.state[property] = value;
    this.state.lastAction = `${property}_updated`;
    
    this.notifyListeners('property_updated', { property, value });
    return this.state;
  }

  /**
   * Check if currently in specific intent
   */
  isIntent(intent) {
    return this.state.currentIntent === intent;
  }

  /**
   * Check if currently in specific quotation step
   */
  isQuotationStep(step) {
    return this.state.currentIntent === 'quotation_intent' && this.state.quotationStep === step;
  }

  /**
   * Check if awaiting specific input type
   */
  isAwaitingInput(inputType = null) {
    if (inputType) {
      return this.state.isAwaitingInput && this.state.awaitingInputType === inputType;
    }
    return this.state.isAwaitingInput;
  }

  /**
   * Route message based on current state
   */
  routeMessage(message) {
    this.state.conversationContext.lastMessage = message;
    this.state.sessionData.interactionCount++;

    const routing = {
      intent: this.state.currentIntent,
      step: this.state.quotationStep,
      awaitingInput: this.state.awaitingInputType,
      action: this.determineAction(message),
      context: this.getRoutingContext()
    };

    this.state.lastAction = `message_routed_${routing.action}`;
    this.notifyListeners('message_routed', routing);
    
    return routing;
  }

  /**
   * Determine what action to take based on current state and message
   */
  determineAction(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Handle global commands first
    if (lowerMessage === 'reset' || lowerMessage === 'start over') {
      return 'reset';
    }
    if (lowerMessage === 'help' || lowerMessage === '?') {
      return 'show_help';
    }
    if (lowerMessage === 'status' || lowerMessage === 'where am i') {
      return 'show_status';
    }

    // Handle based on current intent
    switch (this.state.currentIntent) {
      case 'idle':
        return this.determineIdleAction(lowerMessage);
      
      case 'quotation_intent':
        return this.determineQuotationAction(lowerMessage);
      
      case 'checklist_mode':
        return this.determineChecklistAction(lowerMessage);
      
      case 'orchestrator_mode':
        return this.determineOrchestratorAction(lowerMessage);
      
      default:
        return 'parse_intent';
    }
  }

  /**
   * Determine action when in idle state
   */
  determineIdleAction(message) {
    if (this.containsQuotationKeywords(message)) {
      return 'start_quotation';
    }
    if (this.containsCustomerKeywords(message)) {
      return 'start_customer_mgmt';
    }
    return 'parse_intent';
  }

  /**
   * Determine action when in quotation intent
   */
  determineQuotationAction(message) {
    if (this.state.isAwaitingInput) {
      return `provide_${this.state.awaitingInputType}`;
    }

    switch (this.state.quotationStep) {
      case 'collectingCustomer':
        return 'provide_customer_name';
      case 'collectingItems':
        return 'provide_product_details';
      case 'confirm':
        return message.includes('yes') ? 'confirm_quotation' : 'edit_quotation';
      default:
        return 'continue_quotation';
    }
  }

  /**
   * Determine action when in checklist mode
   */
  determineChecklistAction(message) {
    if (message === 'yes' || message === 'y') {
      return 'checklist_yes';
    }
    if (message === 'no' || message === 'n') {
      return 'checklist_no';
    }
    return 'checklist_input';
  }

  /**
   * Determine action when in orchestrator mode
   */
  determineOrchestratorAction(message) {
    if (message.startsWith('button:')) {
      return 'button_click';
    }
    return 'orchestrator_input';
  }

  /**
   * Get routing context for handlers
   */
  getRoutingContext() {
    return {
      quotationDraft: this.state.quotationDraft,
      checklistData: this.state.checklistData,
      temporaryData: this.state.temporaryData,
      lastAction: this.state.lastAction,
      sessionData: this.state.sessionData
    };
  }

  /**
   * Check if message contains quotation keywords
   */
  containsQuotationKeywords(message) {
    const keywords = ['quote', 'quotation', 'estimate', 'price', 'cost'];
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Check if message contains customer keywords
   */
  containsCustomerKeywords(message) {
    const keywords = ['customer', 'client', 'add customer', 'new customer'];
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.saveStateToHistory();
    this.state = this.getInitialState();
    this.notifyListeners('state_reset', {});
    return this.state;
  }

  /**
   * Go back to previous state
   */
  goBack() {
    if (this.stateHistory.length > 0) {
      const previousState = this.stateHistory.pop();
      this.state = { ...previousState };
      this.notifyListeners('state_reverted', {});
      return this.state;
    }
    return this.state;
  }

  /**
   * Save current state to history
   */
  saveStateToHistory() {
    this.stateHistory.push({ ...this.state });
    
    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary() {
    return {
      intent: this.state.currentIntent,
      step: this.state.quotationStep,
      awaiting: this.state.awaitingInputType,
      hasQuotationDraft: Object.keys(this.state.quotationDraft).length > 0,
      hasChecklistData: Object.keys(this.state.checklistData).length > 0,
      interactionCount: this.state.sessionData.interactionCount,
      lastAction: this.state.lastAction
    };
  }

  /**
   * Add state change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove state change listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data, this.state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  /**
   * Update conversation context
   */
  updateConversationContext(context) {
    this.state.conversationContext = { 
      ...this.state.conversationContext, 
      ...context 
    };
    this.notifyListeners('conversation_context_updated', context);
    return this.state;
  }

  /**
   * Set user preference (guided, quick, hybrid)
   */
  setUserPreference(preference) {
    this.state.conversationContext.userPreference = preference;
    this.state.lastAction = `preference_set_${preference}`;
    this.notifyListeners('user_preference_changed', { preference });
    return this.state;
  }

  /**
   * Mark quotation as completed
   */
  markQuotationCompleted(quoteId) {
    this.state.sessionData.completedQuotes++;
    this.state.sessionData.currentQuoteId = null;
    this.state.lastAction = "quotation_completed";
    
    // Reset quotation-related state
    this.state.quotationDraft = {};
    this.state.checklistData = {};
    this.state.quotationStep = null;
    
    this.notifyListeners('quotation_completed', { quoteId });
    return this.state;
  }

  /**
   * Set error state
   */
  setErrorState(error, context = {}) {
    this.state.flags.inErrorState = true;
    this.state.temporaryData.error = { message: error, context, timestamp: Date.now() };
    this.state.lastAction = "error_occurred";
    
    this.notifyListeners('error_state', { error, context });
    return this.state;
  }

  /**
   * Clear error state
   */
  clearErrorState() {
    this.state.flags.inErrorState = false;
    delete this.state.temporaryData.error;
    this.state.lastAction = "error_cleared";
    
    this.notifyListeners('error_cleared', {});
    return this.state;
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      state: this.state,
      history: this.stateHistory,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import state from persistence
   */
  importState(exportedState) {
    if (exportedState.state) {
      this.state = { ...this.getInitialState(), ...exportedState.state };
    }
    if (exportedState.history) {
      this.stateHistory = exportedState.history;
    }
    
    this.notifyListeners('state_imported', exportedState);
    return this.state;
  }
}

// Export singleton instance
const chatbotStateManager = new ChatbotStateManager();

export default chatbotStateManager;
export { ChatbotStateManager }; 