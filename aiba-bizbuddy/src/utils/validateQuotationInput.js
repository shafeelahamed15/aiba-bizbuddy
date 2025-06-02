export const validateQuotationData = (data) => {
  const required = [];
  const optional = [];

  // Essential required fields
  if (!data.customerName || data.customerName.trim() === "") {
    required.push("Customer Name");
  }
  
  if (!data.items || data.items.length === 0) {
    required.push("Item(s)");
  } else {
    // Validate individual items
    data.items.forEach((item, index) => {
      if (!item.description || item.description.trim() === "") {
        required.push(`Item ${index + 1} Description`);
      }
      if (!item.quantity || item.quantity <= 0) {
        required.push(`Item ${index + 1} Quantity`);
      }
      if (!item.rate || item.rate <= 0) {
        required.push(`Item ${index + 1} Rate`);
      }
    });
  }

  // Set default GST if not provided
  if (!data.gst && data.gst !== 0) {
    data.gst = 18;
  }

  // OPTIONAL: Use fallback or generic defaults
  if (!data.transport && !data.transportCharges) {
    data.transport = "Not Mentioned";
  }
  
  if (!data.loadingCharges) {
    data.loadingCharges = "Not Mentioned";
  }
  
  if (!data.paymentTerms) {
    data.paymentTerms = "Not Provided";
  }
  
  if (!data.deliveryPeriod && !data.deliveryTerms) {
    data.deliveryTerms = "Not Provided";
  }
  
  if (!data.priceValidity) {
    data.priceValidity = "Not Provided";
  }

  return {
    isComplete: required.length === 0,
    missingRequired: required,
    optionalFields: optional,
    updatedData: data,
    validationSummary: {
      requiredMissing: required.length,
      status: required.length === 0 ? "READY" : "INCOMPLETE"
    }
  };
};

export const getValidationMessage = (validationResult) => {
  const { isComplete, missingRequired } = validationResult;
  
  if (isComplete) {
    return `✅ Quotation data is complete and ready!
    
All required fields are filled. Ready to generate PDF?`;
  } else {
    return `❌ Quotation incomplete!
    
Missing Required: ${missingRequired.join(", ")}

Please provide the missing required information to continue.`;
  }
};

export const validateMinimumQuotationData = (data) => {
  // Ultra-minimal validation for quick checks
  return !!(data.customerName && data.items && data.items.length > 0);
}; 