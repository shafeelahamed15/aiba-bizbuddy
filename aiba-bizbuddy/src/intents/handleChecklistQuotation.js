/**
 * Checklist Quotation Handler
 * Manages step-by-step quotation creation using the dynamic checklist system
 */

import { formatStepPrompt } from '../utils/quotationChecklist';

/**
 * Handle checklist-based quotation input
 */
export async function handleChecklistQuotation(message, checklist, context = {}) {
  console.log('📋 Processing checklist quotation input:', message);

  try {
    // Check if we're waiting for "add more items" response
    if (context.awaitingMoreItems) {
      return handleMoreItemsResponse(message, checklist, context);
    }

    // Process the input through the checklist
    const result = checklist.processInput(message);
    
    if (!result.success) {
      return {
        success: false,
        response: result.message,
        requiresProcessing: false,
        checklistData: {
          checklist: checklist,
          currentStep: checklist.getCurrentStep()
        }
      };
    }

    // Handle completion
    if (result.isComplete) {
      const quotationData = checklist.getQuotationData();
      const summary = checklist.getSummary();
      
      return {
        success: true,
        response: `${result.message}\n\n${summary}\n\n🔘 Ready to generate PDF?`,
        requiresProcessing: false,
        showPDFButtons: true,
        quotationData: quotationData,
        checklistComplete: true
      };
    }

    // Handle "add more items" flow
    if (result.awaitingMoreItems) {
      return {
        success: true,
        response: result.message,
        requiresProcessing: false,
        awaitingMoreItems: true,
        checklistData: {
          checklist: checklist,
          currentStep: checklist.getCurrentStep()
        }
      };
    }

    // Continue to next step
    const currentStep = checklist.getCurrentStep();
    let responseMessage = result.message;
    
    if (result.nextPrompt) {
      const progress = checklist.getProgress();
      responseMessage += `\n\n📊 **Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)**\n\n`;
      
      if (currentStep) {
        responseMessage += `**Step ${currentStep.stepIndex || currentStep.currentItemIndex}`;
        
        if (currentStep.isSubStep) {
          responseMessage += ` - ${currentStep.currentSubStep.id}`;
        } else {
          responseMessage += `/${currentStep.totalSteps}: ${currentStep.title}`;
        }
        
        responseMessage += `**\n\n${result.nextPrompt}`;
        
        // Add examples if available
        if (currentStep.examples && !currentStep.isSubStep) {
          responseMessage += `\n\n**Examples:** ${currentStep.examples.join(', ')}`;
        }
        
        if (currentStep.currentSubStep?.examples) {
          responseMessage += `\n\n**Examples:** ${currentStep.currentSubStep.examples.join(', ')}`;
        }
        
        // Add skip option for optional fields
        if (!currentStep.required && !currentStep.isSubStep) {
          responseMessage += `\n\n💡 *Optional - type "skip" to use default*`;
        }
      }
    }

    return {
      success: true,
      response: responseMessage,
      requiresProcessing: false,
      checklistData: {
        checklist: checklist,
        currentStep: currentStep
      }
    };

  } catch (error) {
    console.error('Error in checklist quotation handler:', error);
    return {
      success: false,
      response: "I encountered an error processing your input. Please try again or type 'reset' to start over.",
      requiresProcessing: false,
      checklistData: {
        checklist: checklist,
        currentStep: checklist.getCurrentStep()
      }
    };
  }
}

/**
 * Handle "add more items" response
 */
function handleMoreItemsResponse(message, checklist, context) {
  const result = checklist.handleMoreItemsResponse(message);
  
  if (!result.success) {
    return {
      success: false,
      response: result.message,
      requiresProcessing: false,
      awaitingMoreItems: true,
      checklistData: {
        checklist: checklist,
        currentStep: checklist.getCurrentStep()
      }
    };
  }

  // If continuing with more items
  if (result.nextPrompt) {
    return {
      success: true,
      response: `${result.message}\n\n${result.nextPrompt}`,
      requiresProcessing: false,
      checklistData: {
        checklist: checklist,
        currentStep: checklist.getCurrentStep()
      }
    };
  }

  // If moving to next step
  const currentStep = checklist.getCurrentStep();
  const progress = checklist.getProgress();
  
  let responseMessage = `✅ Products added successfully!\n\n📊 **Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)**\n\n`;
  
  if (currentStep) {
    responseMessage += `**Step ${currentStep.stepIndex}/${currentStep.totalSteps}: ${currentStep.title}**\n\n${formatStepPrompt(currentStep)}`;
  }

  return {
    success: true,
    response: responseMessage,
    requiresProcessing: false,
    checklistData: {
      checklist: checklist,
      currentStep: currentStep
    }
  };
}

/**
 * Handle checklist commands (reset, skip, summary, etc.)
 */
export function handleChecklistCommand(command, checklist, context = {}) {
  const cmd = command.toLowerCase().trim();
  
  switch (cmd) {
    case 'reset':
    case 'start over':
      checklist.reset();
      const firstStep = checklist.getCurrentStep();
      return {
        success: true,
        response: `🔄 **Checklist reset!**\n\n**Step 1/${firstStep.totalSteps}: ${firstStep.title}**\n\n${formatStepPrompt(firstStep)}`,
        requiresProcessing: false,
        checklistData: {
          checklist: checklist,
          currentStep: firstStep
        }
      };

    case 'summary':
    case 'show progress':
      const summary = checklist.getSummary();
      const progress = checklist.getProgress();
      return {
        success: true,
        response: `📊 **Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)**\n\n${summary}`,
        requiresProcessing: false,
        checklistData: {
          checklist: checklist,
          currentStep: checklist.getCurrentStep()
        }
      };

    case 'help':
      const currentStep = checklist.getCurrentStep();
      return {
        success: true,
        response: `📋 **Checklist Help**\n\n**Current Step:** ${currentStep?.title || 'Completed'}\n\n**Commands:**\n• Type your answer to continue\n• "skip" - Skip optional fields\n• "reset" - Start over\n• "summary" - Show current progress\n• "help" - Show this help\n\n**Progress:** ${checklist.getProgress().completed}/${checklist.getProgress().total} steps completed`,
        requiresProcessing: false,
        checklistData: {
          checklist: checklist,
          currentStep: currentStep
        }
      };

    default:
      return null; // Not a recognized command
  }
}

/**
 * Validate if a message is a checklist command
 */
export function isChecklistCommand(message) {
  const commands = ['reset', 'start over', 'summary', 'show progress', 'help'];
  const text = message.toLowerCase().trim();
  return commands.includes(text);
}

/**
 * Get formatted progress display
 */
export function getProgressDisplay(checklist) {
  const progress = checklist.getProgress();
  const currentStep = checklist.getCurrentStep();
  
  let display = `📊 **Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)**\n\n`;
  
  if (currentStep) {
    display += `**Current Step:** ${currentStep.title}\n`;
    
    if (currentStep.isSubStep) {
      display += `**Sub-step:** ${currentStep.currentSubStep.id} (${currentStep.subStepIndex + 1}/${currentStep.totalSubSteps})\n`;
    }
  } else {
    display += `**Status:** ✅ All steps completed!\n`;
  }
  
  return display;
}

/**
 * Export checklist data for PDF generation
 */
export function exportChecklistData(checklist) {
  const data = checklist.getQuotationData();
  
  // Ensure all required fields are present for PDF generation
  return {
    customerName: data.customerName || '',
    customerAddress: '',
    customerGSTIN: '',
    products: (data.products || data.items || []).map(item => ({
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: item.amount
    })),
    gst: data.gst,
    transport: data.transport,
    loadingCharges: data.loadingCharges,
    paymentTerms: data.paymentTerms,
    deliveryTerms: '',
    priceValidity: data.priceValidity
  };
} 