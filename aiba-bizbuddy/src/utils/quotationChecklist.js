/**
 * Dynamic Quotation Checklist System
 * Handles step-by-step input collection for quotation creation
 */

// Base quotation schema
export const QUOTATION_SCHEMA = {
  customerName: "",
  items: [],
  gst: 18,
  transport: "Not specified",
  loadingCharges: "Not specified", 
  paymentTerms: "Not specified",
  priceValidity: "Not specified"
};

// Checklist step definitions
export const CHECKLIST_STEPS = [
  {
    id: 'customerName',
    field: 'customerName',
    title: 'Customer Information',
    prompt: 'What is the customer name or company name?',
    required: true,
    type: 'text',
    validation: {
      minLength: 2,
      pattern: /^[a-zA-Z0-9\s&\-.,()]+$/,
      errorMessage: 'Customer name should be at least 2 characters and contain only letters, numbers, spaces, and common business symbols.'
    },
    examples: ['ABC Company', 'Swastik Industries', 'XYZ Construction Pvt Ltd']
  },
  {
    id: 'items',
    field: 'items',
    title: 'Product Items',
    prompt: 'Let\'s add products to your quotation. Please provide item details:',
    required: true,
    type: 'array',
    subSteps: [
      {
        id: 'description',
        prompt: 'What is the product description?',
        examples: ['TMT Bars 10mm', 'ISMB 150', 'HR Sheet 2mm']
      },
      {
        id: 'quantity',
        prompt: 'What is the quantity (in kg)?',
        type: 'number',
        validation: { min: 1 }
      },
      {
        id: 'rate',
        prompt: 'What is the rate per kg (₹)?',
        type: 'number',
        validation: { min: 0.01 }
      }
    ],
    validation: {
      minItems: 1,
      errorMessage: 'At least one product item is required.'
    }
  },
  {
    id: 'gst',
    field: 'gst',
    title: 'GST Percentage',
    prompt: 'What GST percentage should be applied? (Default: 18%)',
    required: false,
    type: 'number',
    defaultValue: 18,
    validation: {
      min: 0,
      max: 100,
      errorMessage: 'GST should be between 0% and 100%.'
    },
    examples: ['18', '12', '5', '0']
  },
  {
    id: 'transport',
    field: 'transport',
    title: 'Transport Terms',
    prompt: 'What are the transport arrangements?',
    required: false,
    type: 'text',
    defaultValue: 'Not specified',
    examples: ['Included', 'Extra as per actuals', 'Buyer arrangement', 'Ex-works']
  },
  {
    id: 'loadingCharges',
    field: 'loadingCharges', 
    title: 'Loading Charges',
    prompt: 'What are the loading charges?',
    required: false,
    type: 'text',
    defaultValue: 'Not specified',
    examples: ['Rs.250 per MT extra', 'Included', 'Buyer arrangement', 'As per actuals']
  },
  {
    id: 'paymentTerms',
    field: 'paymentTerms',
    title: 'Payment Terms',
    prompt: 'What are the payment terms?',
    required: false,
    type: 'text',
    defaultValue: 'Not specified',
    examples: ['100% Advance', '50% Advance, 50% on delivery', 'Net 30 days', 'Cash on delivery']
  },
  {
    id: 'priceValidity',
    field: 'priceValidity',
    title: 'Price Validity',
    prompt: 'How long should this quotation be valid?',
    required: false,
    type: 'text',
    defaultValue: 'Not specified',
    examples: ['7 days', '15 days', '30 days', 'Till stocks last']
  }
];

/**
 * Quotation Checklist Manager Class
 */
export class QuotationChecklist {
  constructor(initialData = {}) {
    this.data = { ...QUOTATION_SCHEMA, ...initialData };
    this.currentStepIndex = 0;
    this.completedSteps = new Set();
    this.isItemSubStep = false;
    this.currentItemIndex = 0;
    this.currentSubStepIndex = 0;
    this.tempItem = {};
  }

  /**
   * Get current step information
   */
  getCurrentStep() {
    if (this.currentStepIndex >= CHECKLIST_STEPS.length) {
      return null; // All steps completed
    }

    const step = CHECKLIST_STEPS[this.currentStepIndex];
    
    // Handle item sub-steps
    if (step.id === 'items' && this.isItemSubStep) {
      const subStep = step.subSteps[this.currentSubStepIndex];
      return {
        ...step,
        currentSubStep: subStep,
        subStepIndex: this.currentSubStepIndex,
        totalSubSteps: step.subSteps.length,
        isSubStep: true,
        currentItemIndex: this.currentItemIndex + 1
      };
    }

    return {
      ...step,
      stepIndex: this.currentStepIndex + 1,
      totalSteps: CHECKLIST_STEPS.length,
      isSubStep: false
    };
  }

  /**
   * Process user input for current step
   */
  processInput(userInput) {
    const currentStep = this.getCurrentStep();
    
    if (!currentStep) {
      return {
        success: false,
        message: 'All steps have been completed.',
        isComplete: true
      };
    }

    // Handle item sub-steps
    if (currentStep.isSubStep) {
      return this.processItemSubStep(userInput, currentStep);
    }

    // Handle regular steps
    return this.processRegularStep(userInput, currentStep);
  }

  /**
   * Process regular step input
   */
  processRegularStep(userInput, step) {
    const trimmedInput = userInput.trim();
    
    // Handle skip for optional fields
    if (!step.required && this.isSkipInput(trimmedInput)) {
      this.data[step.field] = step.defaultValue || "Not specified";
      return this.advanceStep(step);
    }

    // Validate input
    const validation = this.validateInput(trimmedInput, step);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
        isComplete: false
      };
    }

    // Process based on field type
    switch (step.field) {
      case 'customerName':
        this.data.customerName = trimmedInput;
        break;
        
      case 'items':
        // Start item collection process
        this.isItemSubStep = true;
        this.currentSubStepIndex = 0;
        this.tempItem = {};
        return {
          success: true,
          message: 'Great! Let\'s add your first product.',
          nextPrompt: this.getCurrentStep().currentSubStep.prompt,
          isComplete: false
        };
        
      case 'gst':
        this.data.gst = parseFloat(trimmedInput) || 18;
        break;
        
      default:
        this.data[step.field] = trimmedInput;
    }

    return this.advanceStep(step);
  }

  /**
   * Process item sub-step input
   */
  processItemSubStep(userInput, step) {
    const subStep = step.currentSubStep;
    const trimmedInput = userInput.trim();

    // Validate sub-step input
    const validation = this.validateInput(trimmedInput, subStep);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
        isComplete: false
      };
    }

    // Store sub-step data
    switch (subStep.id) {
      case 'description':
        this.tempItem.description = trimmedInput;
        break;
      case 'quantity':
        this.tempItem.qty = parseFloat(trimmedInput);
        break;
      case 'rate':
        this.tempItem.rate = parseFloat(trimmedInput);
        this.tempItem.amount = this.tempItem.qty * this.tempItem.rate;
        break;
    }

    // Advance to next sub-step
    this.currentSubStepIndex++;

    // Check if all sub-steps for current item are complete
    if (this.currentSubStepIndex >= step.subSteps.length) {
      // Add completed item to data
      this.data.items.push({ ...this.tempItem });
      this.currentItemIndex++;

      // Ask if user wants to add another item
      return {
        success: true,
        message: `✅ Added: **${this.tempItem.description}** - ${this.tempItem.qty}kg @ ₹${this.tempItem.rate}/kg = ₹${this.tempItem.amount.toLocaleString()}\n\nWould you like to add another product? (yes/no)`,
        isComplete: false,
        awaitingMoreItems: true
      };
    }

    // Continue with next sub-step
    const nextSubStep = step.subSteps[this.currentSubStepIndex];
    return {
      success: true,
      message: `✅ Got it: ${this.tempItem.description || this.tempItem.qty || this.tempItem.rate}`,
      nextPrompt: nextSubStep.prompt,
      isComplete: false
    };
  }

  /**
   * Handle "add more items" response
   */
  handleMoreItemsResponse(userInput) {
    const response = userInput.toLowerCase().trim();
    
    if (['yes', 'y', 'yeah', 'yep', 'add more', 'another'].includes(response)) {
      // Reset for next item
      this.currentSubStepIndex = 0;
      this.tempItem = {};
      
      return {
        success: true,
        message: `Adding product #${this.currentItemIndex + 1}:`,
        nextPrompt: CHECKLIST_STEPS[1].subSteps[0].prompt,
        isComplete: false
      };
    }
    
    if (['no', 'n', 'nope', 'done', 'finish', 'complete'].includes(response)) {
      // Finish items step and move to next
      this.isItemSubStep = false;
      this.currentStepIndex++;
      return this.advanceStep(null, true);
    }

    return {
      success: false,
      message: 'Please answer "yes" to add another product or "no" to continue.',
      isComplete: false
    };
  }

  /**
   * Advance to next step
   */
  advanceStep(completedStep, skipMessage = false) {
    if (completedStep) {
      this.completedSteps.add(completedStep.id);
      this.currentStepIndex++;
    }

    const nextStep = this.getCurrentStep();
    
    if (!nextStep) {
      return {
        success: true,
        message: '🎉 Quotation checklist completed! Ready to generate PDF.',
        isComplete: true,
        quotationData: this.data
      };
    }

    const message = skipMessage ? '' : `✅ ${completedStep?.title || 'Step'} completed!`;
    
    return {
      success: true,
      message,
      nextPrompt: nextStep.prompt,
      nextStep: nextStep,
      isComplete: false
    };
  }

  /**
   * Validate input based on step configuration
   */
  validateInput(input, step) {
    if (!input && step.required) {
      return {
        isValid: false,
        message: `${step.title || 'This field'} is required. Please provide a valid input.`
      };
    }

    if (!input && !step.required) {
      return { isValid: true }; // Optional field, empty is ok
    }

    const validation = step.validation;
    if (!validation) {
      return { isValid: true };
    }

    // Type-specific validation
    if (step.type === 'number') {
      const num = parseFloat(input);
      if (isNaN(num)) {
        return {
          isValid: false,
          message: `Please enter a valid number for ${step.title || 'this field'}.`
        };
      }
      
      if (validation.min !== undefined && num < validation.min) {
        return {
          isValid: false,
          message: `${step.title || 'Value'} must be at least ${validation.min}.`
        };
      }
      
      if (validation.max !== undefined && num > validation.max) {
        return {
          isValid: false,
          message: `${step.title || 'Value'} must not exceed ${validation.max}.`
        };
      }
    }

    // Text validation
    if (step.type === 'text') {
      if (validation.minLength && input.length < validation.minLength) {
        return {
          isValid: false,
          message: `${step.title || 'Input'} must be at least ${validation.minLength} characters long.`
        };
      }
      
      if (validation.pattern && !validation.pattern.test(input)) {
        return {
          isValid: false,
          message: validation.errorMessage || `${step.title || 'Input'} format is invalid.`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if input is a skip command
   */
  isSkipInput(input) {
    const skipCommands = ['skip', 'pass', 'default', 'later', 'not specified', 'n/a', 'na'];
    return skipCommands.includes(input.toLowerCase());
  }

  /**
   * Get progress summary
   */
  getProgress() {
    const totalSteps = CHECKLIST_STEPS.length;
    const completed = this.completedSteps.size;
    const percentage = Math.round((completed / totalSteps) * 100);
    
    return {
      completed,
      total: totalSteps,
      percentage,
      remaining: totalSteps - completed
    };
  }

  /**
   * Get current quotation summary
   */
  getSummary() {
    const { customerName, products, gst, transport, loadingCharges, paymentTerms, priceValidity } = this.data;
    const items = products || this.data.items || [];
    
    let summary = `**📋 Quotation Summary for ${customerName || 'TBD'}**\n\n`;
    
    if (items.length > 0) {
      summary += '**Products:**\n';
      let subtotal = 0;
      
      items.forEach((item, index) => {
        summary += `${index + 1}. ${item.description} - ${item.qty}kg @ ₹${item.rate}/kg = ₹${item.amount.toLocaleString()}\n`;
        subtotal += item.amount;
      });
      
      const gstAmount = (subtotal * gst) / 100;
      const total = subtotal + gstAmount;
      
      summary += `\n**Subtotal:** ₹${subtotal.toLocaleString()}\n`;
      summary += `**GST (${gst}%):** ₹${gstAmount.toLocaleString()}\n`;
      summary += `**Total:** ₹${total.toLocaleString()}\n\n`;
    }
    
    summary += `**Terms:**\n`;
    summary += `• Transport: ${transport}\n`;
    summary += `• Loading: ${loadingCharges}\n`;
    summary += `• Payment: ${paymentTerms}\n`;
    summary += `• Validity: ${priceValidity}`;
    
    return summary;
  }

  /**
   * Reset checklist to start over
   */
  reset() {
    this.data = { ...QUOTATION_SCHEMA };
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.isItemSubStep = false;
    this.currentItemIndex = 0;
    this.currentSubStepIndex = 0;
    this.tempItem = {};
  }

  /**
   * Skip to specific step
   */
  skipToStep(stepId) {
    const stepIndex = CHECKLIST_STEPS.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      this.currentStepIndex = stepIndex;
      this.isItemSubStep = false;
      return true;
    }
    return false;
  }

  /**
   * Check if checklist is complete
   */
  isComplete() {
    return this.currentStepIndex >= CHECKLIST_STEPS.length;
  }

  /**
   * Get final quotation data
   */
  getQuotationData() {
    return { ...this.data };
  }
}

/**
 * Create a new quotation checklist instance
 */
export function createQuotationChecklist(initialData = {}) {
  return new QuotationChecklist(initialData);
}

/**
 * Helper function to generate step prompt with examples
 */
export function formatStepPrompt(step) {
  let prompt = step.prompt;
  
  if (step.examples && step.examples.length > 0) {
    prompt += `\n\n**Examples:** ${step.examples.join(', ')}`;
  }
  
  if (!step.required) {
    prompt += `\n\n💡 *Optional - type "skip" to use default*`;
  }
  
  return prompt;
}

/**
 * Validate complete quotation data against schema
 */
export function validateQuotationSchema(data) {
  const errors = [];
  
  if (!data.customerName || data.customerName.trim().length < 2) {
    errors.push('Customer name is required and must be at least 2 characters');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('At least one product item is required');
  }
  
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      if (!item.description || item.description.trim().length === 0) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if (!item.qty || item.qty <= 0) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.rate || item.rate <= 0) {
        errors.push(`Item ${index + 1}: Valid rate is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 