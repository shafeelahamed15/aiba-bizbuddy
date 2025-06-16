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
 * 🔧 ENHANCED: UOM-aware validation for critical fields
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
    // 🔧 SMART VALIDATION: Check products based on UOM requirements
    const itemsToValidate = data.products || data.items || [];
    const uomPreference = data.uomPreference || 'Nos';
    
    itemsToValidate.forEach((item, index) => {
      // Always require description and quantity
      if (!item.description || item.description.trim() === "") {
        criticalMissing.push(`Item ${index + 1} Description`);
      }
      
      const quantity = item.quantity || item.qty || item.nos;
      if (!quantity || quantity <= 0) {
        criticalMissing.push(`Item ${index + 1} Quantity`);
      }
      
      // 🎯 UOM-SPECIFIC VALIDATION
      const itemUom = item.uom || uomPreference;
      if (itemUom === 'Kgs' || itemUom === 'Kg') {
        // For weight-based UOM, require weight info
        if (!item.weightPerUnit && !item.weight && !item.totalWeight) {
          warnings.push(`Item ${index + 1}: Weight information recommended for Kg-based quotations`);
        }
      } else if (itemUom === 'Metres' || itemUom === 'MTR') {
        // For length-based UOM, require length info
        if (!item.length && !item.totalMtrs) {
          warnings.push(`Item ${index + 1}: Length information recommended for Metre-based quotations`);
        }
      }
      
      // 🔧 FLEXIBLE RATE VALIDATION: Only require rate if not provided elsewhere
      if (!item.rate && !item.ratePerMtr && !item.ratePerKg && !item.amount) {
        warnings.push(`Item ${index + 1}: No rate specified - will use default pricing`);
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

/**
 * 🔧 NEW: Enhanced parser result validation 
 * Validates products based on UOM-specific requirements
 * @param {object} parseResult - Result from enhanced parser
 * @returns {boolean} Whether products have valid structure for quotation
 */
export const validateEnhancedParserResult = (parseResult) => {
  if (!parseResult.products || parseResult.products.length === 0) {
    return false;
  }
  
  const hasValidProducts = parseResult.products.every(p => {
    // Always require description and quantity
    if (!p.description || !p.quantity) {
      return false;
    }
    
    // UOM-specific validation
    const uom = p.uom || parseResult.uomPreference || 'Nos';
    
    if (uom === 'Kgs' || uom === 'Kg') {
      // For weight-based: require weight info
      return p.weightPerUnit || p.weight || p.totalWeight;
    } else if (uom === 'Metres' || uom === 'MTR' || uom === 'Mtrs') {
      // For length-based: require length info  
      return p.length || p.totalMtrs;
    } else {
      // For other UOMs (Nos, pieces, etc.): just need quantity
      return p.quantity > 0;
    }
  });
  
  return hasValidProducts;
};

/**
 * 🔧 NEW: Check if quotation can proceed to PDF generation
 * Less strict than full validation - allows proceeding even without all details
 * @param {object} data - Quotation data
 * @returns {object} Can proceed status and reasoning
 */
export const canProceedToPDF = (data) => {
  const issues = [];
  
  if (!data.customerName || data.customerName.trim() === "") {
    issues.push("Missing customer name");
  }
  
  const items = data.products || data.items || [];
  if (items.length === 0) {
    issues.push("No products found");
  }
  
  // Check if items have basic structure
  items.forEach((item, index) => {
    if (!item.description) {
      issues.push(`Item ${index + 1} missing description`);
    }
    if (!item.quantity && !item.qty && !item.nos) {
      issues.push(`Item ${index + 1} missing quantity`);
    }
  });
  
  return {
    canProceed: issues.length === 0,
    issues: issues,
    confidence: issues.length === 0 ? 'high' : 'low'
  };
}; 