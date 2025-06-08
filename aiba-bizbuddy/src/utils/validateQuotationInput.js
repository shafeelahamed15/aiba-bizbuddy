/**
 * Apply fallback defaults for non-critical fields
 * @param {object} data - Quotation data
 * @returns {object} Data with fallback defaults applied
 */
export function applyFallbackDefaults(data) {
  return {
    ...data,
    transport: data.transport || "Not Specified",
    loadingCharges: data.loadingCharges || "Not Specified", 
    paymentTerms: data.paymentTerms || "Not Specified",
    priceValidity: data.priceValidity || "Not Specified",
    deliveryTerms: data.deliveryTerms || "Not Specified",
    gst: data.gst || 18
  };
}

/**
 * Validate only critical fields required for quotation generation
 * @param {object} data - Quotation data
 * @returns {object} Validation result focusing on critical fields only
 */
export const validateCriticalFields = (data) => {
  const criticalMissing = [];
  const warnings = [];

  // Critical required fields
  if (!data.customerName || data.customerName.trim() === "") {
    criticalMissing.push("Customer Name");
  }
  
  if (!data.products && (!data.items || data.items.length === 0)) {
    criticalMissing.push("Item(s)");
  } else {
    // Validate individual items (use products or items)
    const itemsToValidate = data.products || data.items || [];
    itemsToValidate.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        criticalMissing.push(`Item ${index + 1} Description`);
      }
      if (!item.quantity && !item.qty) {
        criticalMissing.push(`Item ${index + 1} Quantity`);
      }
      if (!item.rate || item.rate <= 0) {
        criticalMissing.push(`Item ${index + 1} Rate`);
      }
    });
  }

  // Check non-critical fields for warnings
  if (!data.transport) {
    warnings.push("Transport terms not specified - using default");
  }
  
  if (!data.loadingCharges) {
    warnings.push("Loading charges not specified - using default");
  }
  
  if (!data.paymentTerms) {
    warnings.push("Payment terms not specified - using default");
  }
  
  if (!data.priceValidity) {
    warnings.push("Price validity not specified - using default");
  }

  return {
    isComplete: criticalMissing.length === 0,
    missingCritical: criticalMissing,
    warnings: warnings,
    canProceed: criticalMissing.length === 0, // Can proceed if only non-critical fields missing
    updatedData: applyFallbackDefaults(data),
    validationSummary: {
      criticalMissing: criticalMissing.length,
      status: criticalMissing.length === 0 ? "READY" : "NEEDS_CRITICAL_DATA"
    }
  };
};

export const validateQuotationData = (data) => {
  const required = [];
  const optional = [];

  // Essential required fields
  if (!data.customerName || data.customerName.trim() === "") {
    required.push("Customer Name");
  }
  
  if (!data.items && !data.products) {
    required.push("Item(s)");
  } else {
    // Validate individual items (handle both items and products)
    const itemsToValidate = data.products || data.items || [];
    itemsToValidate.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        required.push(`Item ${index + 1} Description`);
      }
      if (!item.quantity && !item.qty) {
        required.push(`Item ${index + 1} Quantity`);
      }
      if (!item.rate || item.rate <= 0) {
        required.push(`Item ${index + 1} Rate`);
      }
    });
  }

  // Apply fallback defaults for non-critical fields
  const updatedData = applyFallbackDefaults(data);

  return {
    isComplete: required.length === 0,
    missingRequired: required,
    optionalFields: optional,
    updatedData: updatedData,
    validationSummary: {
      requiredMissing: required.length,
      status: required.length === 0 ? "READY" : "INCOMPLETE"
    }
  };
};

export const getValidationMessage = (validationResult) => {
  const { isComplete, missingRequired, warnings } = validationResult;
  
  if (isComplete) {
    let message = `✅ Quotation data is complete and ready!\n\nAll required fields are filled.`;
    
    if (warnings && warnings.length > 0) {
      message += `\n\n⚠️ Note: ${warnings.join(', ')}`;
    }
    
    message += `\n\nReady to generate PDF?`;
    return message;
  } else {
    return `❌ Quotation incomplete!\n\nMissing Critical: ${missingRequired.join(", ")}\n\nPlease provide the missing required information to continue.`;
  }
};

/**
 * Get validation message specifically for critical fields validation
 * @param {object} validationResult - Result from validateCriticalFields
 * @returns {string} Formatted validation message
 */
export const getCriticalValidationMessage = (validationResult) => {
  const { isComplete, missingCritical, warnings } = validationResult;
  
  if (isComplete) {
    let message = `✅ All critical fields are present!\n\nReady to generate quotation.`;
    
    if (warnings && warnings.length > 0) {
      message += `\n\n⚠️ Defaults applied: ${warnings.join(', ')}`;
    }
    
    return message;
  } else {
    return `❌ Critical fields missing!\n\nMissing: ${missingCritical.join(", ")}\n\nPlease provide these essential details to continue.`;
  }
};

export const validateMinimumQuotationData = (data) => {
  // Ultra-minimal validation for quick checks
  const itemsToCheck = data.products || data.items || [];
  return !!(data.customerName && itemsToCheck.length > 0);
}; 