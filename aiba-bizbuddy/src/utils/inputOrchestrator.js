/**
 * Input Orchestrator for Quotation Building
 * Handles dual-mode input: typed prompts + UI button interactions
 * Manages quotation draft state and coordinates between different input methods
 */

import { parseQuotationPrompt } from './parseQuotationInput';
import { validateQuotationData, validateCriticalFields } from './validateQuotationInput';
import { createQuotationChecklist } from './quotationChecklist';
import { calculateWeight, isValidItem } from './calculateWeight';

// Base quotation draft schema
export const QUOTATION_DRAFT_SCHEMA = {
  customerName: '',
  customerAddress: '',
  customerGSTIN: '',
  products: [],
  gst: 18,
  transport: 'Not specified',
  loadingCharges: 'Not specified',
  paymentTerms: 'Not specified',
  deliveryTerms: 'Not specified',
  priceValidity: 'Not specified',
  metadata: {
    source: 'orchestrator',
    lastUpdated: null,
    completionPercentage: 0,
    missingFields: [],
    suggestions: []
  }
};

/**
 * Input Orchestrator Class
 */
export class InputOrchestrator {
  constructor(initialDraft = {}) {
    this.quotationDraftState = { ...QUOTATION_DRAFT_SCHEMA, ...initialDraft };
    this.checklist = null;
    this.mode = 'hybrid';
    this.history = [];
  }

  /**
   * Main entry point - processes any user input
   */
  async processInput(input, inputType = 'prompt', context = {}) {
    console.log('🎯 Processing input:', { input, inputType, mode: this.mode });

    const result = {
      success: false,
      message: '',
      draftState: null,
      actionType: 'none',
      suggestedActions: [],
      uiButtons: [],
      requiresUserInput: false,
      nextStep: null
    };

    try {
      this.quotationDraftState.metadata.lastUpdated = new Date();
      this.addToHistory(input, inputType);

      switch (inputType) {
        case 'prompt':
          return await this.handlePromptInput(input, context);
        case 'button':
          return await this.handleButtonAction(input, context);
        case 'checklist':
          return await this.handleChecklistInput(input, context);
        default:
          return await this.handleHybridInput(input, context);
      }

    } catch (error) {
      console.error('Error in input orchestrator:', error);
      return {
        ...result,
        message: 'An error occurred while processing your input. Please try again.',
        actionType: 'error'
      };
    }
  }

  /**
   * Handle typed prompt input
   */
  async handlePromptInput(message, context = {}) {
    console.log('📝 Processing prompt input:', message);

    const parseResult = await this.parsePromptToQuote(message);
    
    if (parseResult.success) {
      this.mergeDraftData(parseResult.quotationData);
      
      const missingFields = this.checkMissingFields();
      
      if (missingFields.length === 0) {
        return {
          success: true,
          message: this.generateCompletionMessage(),
          draftState: this.quotationDraftState,
          actionType: 'complete',
          uiButtons: this.generateCompletionButtons(),
          requiresUserInput: false
        };
      } else {
        return {
          success: true,
          message: this.generatePartialDataMessage(missingFields),
          draftState: this.quotationDraftState,
          actionType: 'request_more',
          suggestedActions: this.generateSuggestedActions(missingFields),
          uiButtons: this.generateActionButtons(missingFields),
          requiresUserInput: true,
          nextStep: missingFields[0]
        };
      }
    } else {
      const partialData = await this.extractPartialData(message);
      
      if (partialData.found) {
        this.mergeDraftData(partialData.data);
        
        return {
          success: true,
          message: `✅ ${partialData.message}\n\n${this.generateCurrentStateMessage()}`,
          draftState: this.quotationDraftState,
          actionType: 'update',
          suggestedActions: this.generateSuggestedActions(),
          uiButtons: this.generateActionButtons(),
          requiresUserInput: true
        };
      } else {
        return {
          success: false,
          message: this.generateHelpMessage(message),
          draftState: this.quotationDraftState,
          actionType: 'request_more',
          suggestedActions: [
            'Use guided quotation',
            'Add customer name',
            'Add product details',
            'Try a different format'
          ],
          uiButtons: this.generateHelpButtons(),
          requiresUserInput: true
        };
      }
    }
  }

  /**
   * Parse prompt to complete quotation
   */
  async parsePromptToQuote(message) {
    try {
      const parseResult = await parseQuotationPrompt(message);
      
      if (parseResult && parseResult.customerName && parseResult.products && parseResult.products.length > 0) {
        return {
          success: true,
          quotationData: this.normalizeQuotationData(parseResult),
          confidence: this.calculateParseConfidence(parseResult)
        };
      }
      
      return { success: false, reason: 'Incomplete data' };
    } catch (error) {
      console.error('Parse error:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Extract partial data from message
   */
  async extractPartialData(message) {
    const data = {};
    let found = false;
    let messages = [];

    // Extract customer name patterns
    const customerPatterns = [
      /(?:for|to)\s+([A-Za-z][A-Za-z\s&\-.,()]+?)(?:\s*[:;]|\s+(?:ismb|tmt|hr|cr|ms|pipe))/i,
      /customer\s*[:=]\s*([A-Za-z][A-Za-z\s&\-.,()]+)/i,
      /quote\s+(?:for\s+)?([A-Za-z][A-Za-z\s&\-.,()]+)/i
    ];

    for (const pattern of customerPatterns) {
      const match = message.match(pattern);
      if (match) {
        data.customerName = match[1].trim();
        found = true;
        messages.push(`Customer identified: ${data.customerName}`);
        break;
      }
    }

    // Extract product information
    const productPatterns = [
      /([A-Za-z][A-Za-z\s0-9]+)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:nos?|pcs?|mt|kg|tonnes?)\s*@\s*[₹₨]?(\d+(?:\.\d+)?)/gi,
      /(ismb|ismc|isa|tmt|hr|cr|ms)[\s]*([\d]+(?:mm|inch)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:nos?|pcs?|mt|kg|tonnes?)\s*@\s*[₹₨]?(\d+(?:\.\d+)?)/gi
    ];

    if (!data.products) data.products = [];

    for (const pattern of productPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const product = {
          description: match[1] || `${match[1]} ${match[2]}`,
          qty: parseFloat(match[2] || match[3]),
          rate: parseFloat(match[3] || match[4])
        };
        product.amount = product.qty * product.rate;
        
        data.products.push(product);
        found = true;
        messages.push(`Product added: ${product.description}`);
      }
    }

    // Extract GST
    const gstMatch = message.match(/(?:gst|tax)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?/i);
    if (gstMatch) {
      data.gst = parseFloat(gstMatch[1]);
      found = true;
      messages.push(`GST set to ${data.gst}%`);
    }

    return {
      found,
      data,
      message: messages.join(', ') || 'Some information extracted'
    };
  }

  /**
   * Check for missing required fields
   */
  checkMissingFields() {
    const missing = [];
    
    if (!this.quotationDraftState.customerName || this.quotationDraftState.customerName.trim() === '') {
      missing.push('customerName');
    }
    
    if (!this.quotationDraftState.products || this.quotationDraftState.products.length === 0) {
      missing.push('products');
    }
    
    if (this.quotationDraftState.products && this.quotationDraftState.products.length > 0) {
      this.quotationDraftState.products.forEach((product, index) => {
        if (!product.description || !product.qty || !product.rate) {
          missing.push(`product_${index}_details`);
        }
      });
    }
    
    this.quotationDraftState.metadata.missingFields = missing;
    this.quotationDraftState.metadata.completionPercentage = this.calculateCompletionPercentage();
    
    return missing;
  }

  /**
   * Merge new data into draft state
   */
  mergeDraftData(newData) {
    if (newData.customerName) {
      this.quotationDraftState.customerName = newData.customerName;
    }
    if (newData.customerAddress) {
      this.quotationDraftState.customerAddress = newData.customerAddress;
    }
    if (newData.customerGSTIN) {
      this.quotationDraftState.customerGSTIN = newData.customerGSTIN;
    }

    if (newData.products && newData.products.length > 0) {
      this.quotationDraftState.products = [
        ...this.quotationDraftState.products,
        ...newData.products
      ];
    }

    ['gst', 'transport', 'loadingCharges', 'paymentTerms', 'deliveryTerms', 'priceValidity'].forEach(field => {
      if (newData[field] !== undefined && newData[field] !== 'Not specified') {
        this.quotationDraftState[field] = newData[field];
      }
    });

    this.quotationDraftState.metadata.lastUpdated = new Date();
  }

  /**
   * Generate UI buttons
   */
  generateActionButtons(missingFields = []) {
    const buttons = [];
    
    if (!this.quotationDraftState.customerName || missingFields.includes('customerName')) {
      buttons.push({ type: 'select_customer', text: '👤 Select Customer', variant: 'primary' });
    }
    
    if (!this.quotationDraftState.products || this.quotationDraftState.products.length === 0 || missingFields.includes('products')) {
      buttons.push({ type: 'add_product', text: '➕ Add Product', variant: 'primary' });
    }
    
    buttons.push({ type: 'add_gst', text: '🧾 Add GST', variant: 'secondary' });
    buttons.push({ type: 'start_checklist', text: '📋 Guided Mode', variant: 'secondary' });
    
    if (missingFields.length === 0) {
      buttons.push({ type: 'finalize_quote', text: '✅ Finalize Quote', variant: 'success' });
    }
    
    buttons.push({ type: 'clear_draft', text: '🗑️ Clear', variant: 'danger' });
    
    return buttons;
  }

  generateCompletionButtons() {
    return [
      { type: 'generate_pdf', text: '📄 Generate PDF', variant: 'success' },
      { type: 'save_quote', text: '💾 Save Quote', variant: 'primary' },
      { type: 'send_email', text: '📧 Send Email', variant: 'secondary' },
      { type: 'create_new', text: '➕ New Quote', variant: 'secondary' }
    ];
  }

  generateHelpButtons() {
    return [
      { type: 'start_checklist', text: '📋 Guided Mode', variant: 'primary' },
      { type: 'show_examples', text: '💡 Show Examples', variant: 'secondary' },
      { type: 'load_template', text: '📄 Use Template', variant: 'secondary' }
    ];
  }

  /**
   * Message generators
   */
  generateCompletionMessage() {
    const { customerName, products } = this.quotationDraftState;
    const total = products.reduce((sum, p) => sum + (p.amount || 0), 0);
    const gstAmount = (total * this.quotationDraftState.gst) / 100;
    
    return `🎉 **Quotation Complete!**\n\n**Customer:** ${customerName}\n**Products:** ${products.length}\n**Subtotal:** ₹${total.toLocaleString()}\n**GST (${this.quotationDraftState.gst}%):** ₹${gstAmount.toLocaleString()}\n**Total:** ₹${(total + gstAmount).toLocaleString()}`;
  }

  generatePartialDataMessage(missingFields) {
    const completion = this.calculateCompletionPercentage();
    return `✅ **Quotation ${completion}% Complete**\n\n${this.generateCurrentStateMessage()}\n\n**Missing:** ${missingFields.map(f => f.replace('_', ' ')).join(', ')}`;
  }

  generateCurrentStateMessage() {
    const { customerName, products, gst } = this.quotationDraftState;
    let message = '**Current State:**\n';
    
    if (customerName) message += `👤 Customer: ${customerName}\n`;
    if (products && products.length > 0) {
      message += `📦 Products: ${products.length}\n`;
      products.forEach((p, i) => {
        if (p.description) message += `  ${i+1}. ${p.description}${p.qty ? ` - ${p.qty}kg` : ''}${p.rate ? ` @ ₹${p.rate}` : ''}\n`;
      });
    }
    if (gst !== 18) message += `🧾 GST: ${gst}%\n`;
    
    return message.trim();
  }

  generateHelpMessage(originalMessage) {
    return `❓ **Need help with quotation?**\n\nI couldn't understand: "${originalMessage}"\n\n**Try formats like:**\n• "Quote for ABC: TMT 10mm - 5MT @ ₹55"\n• "Create quotation for XYZ Company"\n• Use the guided mode for step-by-step help`;
  }

  /**
   * Utility functions
   */
  generateSuggestedActions(missingFields = []) {
    const suggestions = [];
    
    if (!missingFields.length) {
      missingFields = this.checkMissingFields();
    }
    
    missingFields.forEach(field => {
      switch (field) {
        case 'customerName':
          suggestions.push('Add customer name');
          break;
        case 'products':
          suggestions.push('Add product details');
          break;
        default:
          if (field.startsWith('product_')) {
            suggestions.push('Complete product information');
          }
      }
    });
    
    if (!suggestions.length) {
      suggestions.push('Finalize quotation', 'Generate PDF', 'Add more products');
    }
    
    return suggestions;
  }

  calculateCompletionPercentage() {
    const totalFields = 7;
    let completed = 0;
    
    if (this.quotationDraftState.customerName) completed++;
    if (this.quotationDraftState.products && this.quotationDraftState.products.length > 0) completed++;
    if (this.quotationDraftState.gst !== undefined) completed++;
    if (this.quotationDraftState.transport !== 'Not specified') completed++;
    if (this.quotationDraftState.loadingCharges !== 'Not specified') completed++;
    if (this.quotationDraftState.paymentTerms !== 'Not specified') completed++;
    if (this.quotationDraftState.priceValidity !== 'Not specified') completed++;
    
    return Math.round((completed / totalFields) * 100);
  }

  calculateParseConfidence(parseResult) {
    let confidence = 0;
    
    if (parseResult.customerName) confidence += 30;
    if (parseResult.products && parseResult.products.length > 0) confidence += 40;
    if (parseResult.gst !== undefined) confidence += 10;
    if (parseResult.transport !== 'Not specified') confidence += 5;
    if (parseResult.paymentTerms !== 'Not specified') confidence += 5;
    if (parseResult.priceValidity !== 'Not specified') confidence += 10;
    
    return Math.min(confidence, 100);
  }

  normalizeQuotationData(data) {
    return {
      ...data,
      gst: data.gst || 18,
      transport: data.transport || 'Not specified',
      loadingCharges: data.loadingCharges || 'Not specified',
      paymentTerms: data.paymentTerms || 'Not specified',
      deliveryTerms: data.deliveryTerms || 'Not specified',
      priceValidity: data.priceValidity || 'Not specified'
    };
  }

  addToHistory(input, type) {
    this.history.push({
      input,
      type,
      timestamp: new Date(),
      draftState: JSON.parse(JSON.stringify(this.quotationDraftState))
    });
    
    if (this.history.length > 10) {
      this.history = this.history.slice(-10);
    }
  }

  getDraftState() {
    return { ...this.quotationDraftState };
  }

  reset() {
    this.quotationDraftState = { ...QUOTATION_DRAFT_SCHEMA };
    this.checklist = null;
    this.mode = 'hybrid';
    this.history = [];
  }

  exportForPDF() {
    return {
      customerName: this.quotationDraftState.customerName,
      customerAddress: this.quotationDraftState.customerAddress,
      customerGSTIN: this.quotationDraftState.customerGSTIN,
      products: this.quotationDraftState.products,
      gst: this.quotationDraftState.gst,
      transport: this.quotationDraftState.transport,
      loadingCharges: this.quotationDraftState.loadingCharges,
      paymentTerms: this.quotationDraftState.paymentTerms,
      deliveryTerms: this.quotationDraftState.deliveryTerms,
      priceValidity: this.quotationDraftState.priceValidity
    };
  }

  // Button action handlers
  async handleButtonAction(action, context = {}) {
    console.log('🔘 Processing button action:', action);

    switch (action.type) {
      case 'add_product':
        return await this.handleAddProduct(action.data);
      case 'add_gst':
        return await this.handleAddGST(action.data);
      case 'select_customer':
        return await this.handleSelectCustomer(action.data);
      case 'finalize_quote':
        return await this.handleFinalizeQuote();
      case 'start_checklist':
        return await this.handleStartChecklist();
      case 'clear_draft':
        return await this.handleClearDraft();
      default:
        return {
          success: false,
          message: `Unknown button action: ${action.type}`,
          draftState: this.quotationDraftState,
          actionType: 'error'
        };
    }
  }

  async handleAddProduct(productData) {
    if (productData) {
      this.quotationDraftState.products.push(productData);
      return {
        success: true,
        message: `✅ Product added: ${productData.description}`,
        draftState: this.quotationDraftState,
        actionType: 'update',
        uiButtons: this.generateActionButtons()
      };
    }
    
    return {
      success: true,
      message: 'Please provide product details:',
      draftState: this.quotationDraftState,
      actionType: 'request_more',
      requiresUserInput: true
    };
  }

  async handleAddGST(gstValue) {
    if (gstValue !== undefined) {
      this.quotationDraftState.gst = parseFloat(gstValue) || 18;
      return {
        success: true,
        message: `✅ GST set to ${this.quotationDraftState.gst}%`,
        draftState: this.quotationDraftState,
        actionType: 'update',
        uiButtons: this.generateActionButtons()
      };
    }
    
    return {
      success: true,
      message: 'Enter GST percentage (default: 18%):',
      draftState: this.quotationDraftState,
      actionType: 'request_more',
      requiresUserInput: true
    };
  }

  async handleSelectCustomer(customerData) {
    if (customerData) {
      this.quotationDraftState.customerName = customerData.name || customerData;
      if (customerData.address) this.quotationDraftState.customerAddress = customerData.address;
      if (customerData.gstin) this.quotationDraftState.customerGSTIN = customerData.gstin;
      
      return {
        success: true,
        message: `✅ Customer selected: ${this.quotationDraftState.customerName}`,
        draftState: this.quotationDraftState,
        actionType: 'update',
        uiButtons: this.generateActionButtons()
      };
    }
    
    return {
      success: true,
      message: 'Please enter customer name:',
      draftState: this.quotationDraftState,
      actionType: 'request_more',
      requiresUserInput: true
    };
  }

  async handleFinalizeQuote() {
    const missingFields = this.checkMissingFields();
    
    if (missingFields.length === 0) {
      return {
        success: true,
        message: '🎉 Quotation ready for generation!',
        draftState: this.quotationDraftState,
        actionType: 'complete',
        uiButtons: this.generateCompletionButtons()
      };
    } else {
      return {
        success: false,
        message: `❌ Cannot finalize: Missing ${missingFields.join(', ')}`,
        draftState: this.quotationDraftState,
        actionType: 'request_more',
        suggestedActions: this.generateSuggestedActions(missingFields),
        uiButtons: this.generateActionButtons(missingFields),
        requiresUserInput: true
      };
    }
  }

  async handleStartChecklist() {
    this.checklist = createQuotationChecklist(this.quotationDraftState);
    this.mode = 'checklist';
    
    const currentStep = this.checklist.getCurrentStep();
    
    return {
      success: true,
      message: `📋 Starting guided quotation!\n\n**Step 1/${currentStep.totalSteps}: ${currentStep.title}**\n\n${currentStep.prompt}`,
      draftState: this.quotationDraftState,
      actionType: 'update',
      requiresUserInput: true,
      nextStep: currentStep
    };
  }

  async handleClearDraft() {
    this.quotationDraftState = { ...QUOTATION_DRAFT_SCHEMA };
    this.checklist = null;
    this.mode = 'hybrid';
    
    return {
      success: true,
      message: '🗑️ Draft cleared. Ready for new quotation.',
      draftState: this.quotationDraftState,
      actionType: 'update',
      uiButtons: this.generateActionButtons()
    };
  }

  async handleChecklistInput(input, context = {}) {
    console.log('📋 Processing checklist input:', input);

    if (!this.checklist) {
      this.checklist = createQuotationChecklist(this.quotationDraftState);
    }

    const checklistResult = this.checklist.processInput(input);
    
    if (checklistResult.success) {
      this.quotationDraftState = { 
        ...this.quotationDraftState, 
        ...this.checklist.getQuotationData() 
      };
      
      if (checklistResult.isComplete) {
        return {
          success: true,
          message: checklistResult.message,
          draftState: this.quotationDraftState,
          actionType: 'complete',
          uiButtons: this.generateCompletionButtons(),
          requiresUserInput: false
        };
      } else {
        return {
          success: true,
          message: checklistResult.message,
          draftState: this.quotationDraftState,
          actionType: 'update',
          requiresUserInput: true,
          nextStep: this.checklist.getCurrentStep()
        };
      }
    } else {
      return {
        success: false,
        message: checklistResult.message,
        draftState: this.quotationDraftState,
        actionType: 'error',
        requiresUserInput: true
      };
    }
  }

  async handleHybridInput(input, context = {}) {
    console.log('🔄 Processing hybrid input:', input);

    const promptResult = await this.handlePromptInput(input, context);
    
    if (promptResult.success && promptResult.actionType !== 'error') {
      return promptResult;
    }

    if (this.checklist && this.isChecklistInput(input)) {
      return await this.handleChecklistInput(input, context);
    }

    return promptResult;
  }

  isChecklistInput(input) {
    const checklistPatterns = [
      /^[a-zA-Z][a-zA-Z\s&\-.,()]{1,50}$/,
      /^\d+(\.\d+)?$/,
      /^(yes|no|skip|help|reset|summary)$/i
    ];
    
    return checklistPatterns.some(pattern => pattern.test(input.trim()));
  }
}

/**
 * Factory function to create orchestrator instance
 */
export function createInputOrchestrator(initialDraft = {}) {
  return new InputOrchestrator(initialDraft);
}

/**
 * Helper function to process any input through orchestrator
 */
export async function processQuotationInput(input, inputType = 'prompt', orchestrator = null, context = {}) {
  if (!orchestrator) {
    orchestrator = createInputOrchestrator();
  }
  
  return await orchestrator.processInput(input, inputType, context);
}

/**
 * Quick parse function for simple use cases
 */
export async function quickParseQuote(message) {
  const orchestrator = createInputOrchestrator();
  return await orchestrator.parsePromptToQuote(message);
}

/**
 * Validate if input can create a complete quotation
 */
export function validateQuotationInput(input) {
  const hasCustomer = /(?:for|to)\s+[A-Za-z][A-Za-z\s&\-.,()]+/.test(input);
  const hasProduct = /[A-Za-z][A-Za-z\s0-9]+\s*[-–]\s*\d+/.test(input);
  const hasPrice = /@\s*[₹₨]?\d+/.test(input);
  
  return {
    isValid: hasCustomer && hasProduct && hasPrice,
    hasCustomer,
    hasProduct,
    hasPrice,
    confidence: (hasCustomer ? 33 : 0) + (hasProduct ? 33 : 0) + (hasPrice ? 34 : 0)
  };
} 