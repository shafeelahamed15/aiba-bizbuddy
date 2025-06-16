/**
 * Quotation Formatter with UOM Support
 * Handles both "per kg" and "per meter" calculation modes
 */

/**
 * Format quotation data for display with proper UOM handling
 * @param {Object} quotationData - Parsed quotation data
 * @returns {Object} Formatted quotation with calculated totals
 */
export function formatQuotationWithUOM(quotationData) {
  const products = quotationData.products || quotationData.items || [];
  const {
    customerName,
    gstPercent = 18,
    transport,
    loadingCharges,
    paymentTerms,
    deliveryPeriod,
    priceValidity,
    calculationMode = "per_kg"
  } = quotationData;

  console.log(`🔧 Formatting quotation in ${calculationMode} mode`);

  const formattedItems = [];
  let subtotal = 0;

  // Process each item based on calculation mode
  products.forEach((item, index) => {
    const formattedItem = {
      sl: index + 1,
      description: item.description,
      quantity: 0,
      unit: "",
      rate: item.rate,
      rateUnit: item.rateUnit || "per kg",
      amount: 0
    };

    if (calculationMode === "per_mtr" && item.totalMeters) {
      // Per meter calculation
      formattedItem.quantity = item.totalMeters;
      formattedItem.unit = "Mtrs";
      formattedItem.rate = item.rate;
      formattedItem.rateUnit = "per mtr";
      formattedItem.amount = item.amount || (item.totalMeters * item.rate);
      
      // Add metadata for reference
      formattedItem.metadata = {
        numberOfPieces: item.numberOfPieces,
        lengthPerPiece: item.lengthInMeters,
        calculationDetails: `${item.numberOfPieces} pieces × ${item.lengthInMeters}m = ${item.totalMeters} meters`
      };
    } else {
      // Per kg calculation (default)
      formattedItem.quantity = item.quantity;
      formattedItem.unit = item.unit || "kg";
      formattedItem.rate = item.rate;
      formattedItem.rateUnit = item.rateUnit || "per kg";
      formattedItem.amount = item.amount || (item.quantity * item.rate);
    }

    subtotal += formattedItem.amount;
    formattedItems.push(formattedItem);
  });

  // Calculate GST and total
  const gstAmount = subtotal * (gstPercent / 100);
  const grandTotal = subtotal + gstAmount;

  return {
    customerName,
    products: formattedItems,
    calculationMode,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    transport: transport || "Not specified",
    loadingCharges: loadingCharges || "Not specified",
    paymentTerms: paymentTerms || "Not specified",
    deliveryPeriod: deliveryPeriod || "Not specified",
    priceValidity: priceValidity || "Not specified"
  };
}

/**
 * Generate display text for quotation
 * @param {Object} formattedQuotation - Formatted quotation data
 * @returns {string} Display text
 */
export function generateQuotationDisplayText(formattedQuotation) {
  const {
    customerName,
    products,
    calculationMode,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal,
    transport,
    loadingCharges,
    paymentTerms,
    deliveryPeriod,
    priceValidity
  } = formattedQuotation;

  let displayText = `## Quotation for ${customerName}\n\n`;
  
  if (calculationMode === "per_mtr") {
    displayText += `🔧 **UOM Mode:** Per Meter\n\n`;
  }

  // Items table
  displayText += `**📦 Items:**\n\n`;
  displayText += `| Item Description | Qty (${products[0]?.unit || 'Units'}) | Rate/${products[0]?.rateUnit?.replace('per ', '') || 'unit'} | Amount |\n`;
  displayText += `|---|---|---|---|\n`;

  products.forEach(item => {
    displayText += `| ${item.description} | ${item.quantity} | ₹${item.rate.toLocaleString('en-IN')} | ₹${item.amount.toLocaleString('en-IN')} |\n`;
  });

  // Summary
  displayText += `\n**💰 Summary:**\n`;
  displayText += `- Subtotal: ₹${subtotal.toLocaleString('en-IN')}\n`;
  displayText += `- GST @ ${gstPercent}%: ₹${gstAmount.toLocaleString('en-IN')}\n`;
  displayText += `- **Grand Total: ₹${grandTotal.toLocaleString('en-IN')}**\n\n`;

  // Additional details
  displayText += `**📋 Terms:**\n`;
  displayText += `- Transport: ${transport}\n`;
  displayText += `- Loading Charges: ${loadingCharges}\n`;
  if (paymentTerms && paymentTerms !== "Not specified") {
    displayText += `- Payment Terms: ${paymentTerms}\n`;
  }
  if (deliveryPeriod && deliveryPeriod !== "Not specified") {
    displayText += `- Delivery: ${deliveryPeriod}\n`;
  }
  if (priceValidity && priceValidity !== "Not specified") {
    displayText += `- Price Validity: ${priceValidity}\n`;
  }

  // Show calculation details for meter mode
  if (calculationMode === "per_mtr") {
    displayText += `\n**🔍 Calculation Details:**\n`;
    products.forEach((item, index) => {
      if (item.metadata?.calculationDetails) {
        displayText += `${index + 1}. ${item.description}: ${item.metadata.calculationDetails}\n`;
      }
    });
  }

  return displayText;
}

/**
 * Generate PDF-ready data structure
 * @param {Object} formattedQuotation - Formatted quotation data
 * @returns {Object} PDF data structure
 */
export function generatePDFData(formattedQuotation) {
  const {
    customerName,
    products,
    calculationMode,
    subtotal,
    gstPercent,
    gstAmount,
    grandTotal
  } = formattedQuotation;

  // PDF table rows
  const tableRows = products.map(item => [
    item.description,
    item.quantity.toString(),
    `₹${item.rate.toLocaleString('en-IN')}`,
    `₹${item.amount.toLocaleString('en-IN')}`
  ]);

  // Add summary rows
  tableRows.push(['', '', 'Subtotal', `₹${subtotal.toLocaleString('en-IN')}`]);
  tableRows.push(['', '', `GST @ ${gstPercent}%`, `₹${gstAmount.toLocaleString('en-IN')}`]);
  tableRows.push(['', '', 'Grand Total', `₹${grandTotal.toLocaleString('en-IN')}`]);

  const unitHeader = calculationMode === "per_mtr" ? "Qty (Mtrs)" : "Qty (kg)";
  const rateHeader = calculationMode === "per_mtr" ? "Rate/mtr" : "Rate/kg";

  return {
    customerName,
    tableHeaders: ['Item Description', unitHeader, rateHeader, 'Amount'],
    tableRows,
    calculationMode,
    totals: {
      subtotal,
      gstPercent,
      gstAmount,
      grandTotal
    }
  };
}

/**
 * Validate quotation data for UOM processing
 * @param {Object} quotationData - Raw quotation data
 * @returns {Object} Validation result
 */
export function validateQuotationUOM(quotationData) {
  const errors = [];
  const warnings = [];

  if (!quotationData.customerName) {
    errors.push("Customer name is required");
  }

  if (!quotationData.products || quotationData.products.length === 0) {
    errors.push("At least one item is required");
  }

  // Validate items based on calculation mode
  if (quotationData.calculationMode === "per_mtr") {
    quotationData.products?.forEach((item, index) => {
      if (!item.totalMeters && !item.lengthInMeters) {
        warnings.push(`Item ${index + 1}: No length information found for meter calculation`);
      }
      if (!item.rate) {
        errors.push(`Item ${index + 1}: Rate per meter is required`);
      }
    });
  } else {
    quotationData.products?.forEach((item, index) => {
      if (!item.quantity) {
        errors.push(`Item ${index + 1}: Quantity is required`);
      }
      if (!item.rate) {
        errors.push(`Item ${index + 1}: Rate is required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

export default {
  formatQuotationWithUOM,
  generateQuotationDisplayText,
  generatePDFData,
  validateQuotationUOM
}; 