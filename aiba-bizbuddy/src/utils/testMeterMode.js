/**
 * Test file demonstrating the new "per meter" UOM calculation mode
 * This shows how the enhanced quotation parser handles meter-based calculations
 */

import { parseQuotationPrompt } from './parseQuotationInput.js';
import { formatQuotationWithUOM, generateQuotationDisplayText, generatePDFData } from './quotationFormatter.js';

/**
 * Test the meter mode functionality with the sample prompt
 */
export function testMeterModeQuotation() {
  console.log("🧪 Testing Per Meter UOM Calculation Mode");
  
  // Sample prompt provided by user
  const samplePrompt = `Create quote to SRI ENERGY , VIRALIMALAI. UOM to be in Mtrs. Transport Included, Loading Charges included.

MS Channel 75 x40 x6mm – 6 MTR (Length) – 140 Nos – ₹366.18/mtr
MS Flat 75 x 10mm – 6 MTR – 10 Nos – ₹308.31/mtr
MS Angle 40x40x6mm – 6 MTR – 35 Nos – ₹189.63/mtr
MS Flat 50 x 06 mm – 6 MTR – 300 Nos – ₹123.12/mtr

Add 18% GST`;

  console.log("📝 Sample Input:", samplePrompt);
  console.log("\n" + "=".repeat(50));

  // Step 1: Parse the prompt
  const parsedData = parseQuotationPrompt(samplePrompt);
  console.log("🔍 Parsed Data:", JSON.stringify(parsedData, null, 2));

  // Step 2: Format the quotation
  const formattedQuotation = formatQuotationWithUOM(parsedData);
  console.log("\n🔧 Formatted Quotation:", JSON.stringify(formattedQuotation, null, 2));

  // Step 3: Generate display text
  const displayText = generateQuotationDisplayText(formattedQuotation);
  console.log("\n📄 Display Text:");
  console.log(displayText);

  // Step 4: Generate PDF data
  const pdfData = generatePDFData(formattedQuotation);
  console.log("\n🏗️ PDF Data Structure:", JSON.stringify(pdfData, null, 2));

  return {
    parsedData,
    formattedQuotation,
    displayText,
    pdfData
  };
}

/**
 * Expected output validation
 */
export function validateExpectedOutput() {
  console.log("\n🎯 Expected Final PDF Output:");
  
  const expectedOutput = `
📦 Final PDF Output Example Should Look Like:
Item Description         | Qty (Mtrs) | Rate/mtr  | Amount
MS Channel 75x40x6mm    | 840        | ₹366.18   | ₹3,07,693.20
MS Flat 75x10mm         | 60         | ₹308.31   | ₹18,498.60
MS Angle 40x40x6mm      | 210        | ₹189.63   | ₹39,822.30
MS Flat 50x6mm          | 1800       | ₹123.12   | ₹2,21,616.00
Subtotal                |            |           | ₹6,67,630.10
GST @ 18%               |            |           | ₹1,20,173.42
Grand Total             |            |           | ₹7,87,803.52
`;

  console.log(expectedOutput);
  
  // Calculate expected values for verification
  const expectedCalculations = [
    { desc: "MS Channel 75x40x6mm", pieces: 140, length: 6, rate: 366.18, total: 140 * 6 * 366.18 },
    { desc: "MS Flat 75x10mm", pieces: 10, length: 6, rate: 308.31, total: 10 * 6 * 308.31 },
    { desc: "MS Angle 40x40x6mm", pieces: 35, length: 6, rate: 189.63, total: 35 * 6 * 189.63 },
    { desc: "MS Flat 50x6mm", pieces: 300, length: 6, rate: 123.12, total: 300 * 6 * 123.12 }
  ];

  console.log("\n🧮 Manual Calculation Verification:");
  let subtotal = 0;
  expectedCalculations.forEach(item => {
    const totalMeters = item.pieces * item.length;
    console.log(`${item.desc}: ${item.pieces} pieces × ${item.length}m = ${totalMeters} meters × ₹${item.rate} = ₹${item.total.toLocaleString('en-IN')}`);
    subtotal += item.total;
  });

  const gstAmount = subtotal * 0.18;
  const grandTotal = subtotal + gstAmount;

  console.log(`\nSubtotal: ₹${subtotal.toLocaleString('en-IN')}`);
  console.log(`GST @ 18%: ₹${gstAmount.toLocaleString('en-IN')}`);
  console.log(`Grand Total: ₹${grandTotal.toLocaleString('en-IN')}`);

  return { subtotal, gstAmount, grandTotal };
}

/**
 * Run complete test suite
 */
export function runMeterModeTests() {
  console.log("🚀 Starting Per Meter UOM Test Suite");
  console.log("=".repeat(60));

  try {
    // Test 1: Parse and format
    const testResults = testMeterModeQuotation();
    
    // Test 2: Validate expected output
    const expectedResults = validateExpectedOutput();
    
    // Test 3: Compare results
    console.log("\n✅ Test Results Comparison:");
    const actualSubtotal = testResults.formattedQuotation.subtotal;
    const actualGrandTotal = testResults.formattedQuotation.grandTotal;
    
    console.log(`Expected Subtotal: ₹${expectedResults.subtotal.toLocaleString('en-IN')}`);
    console.log(`Actual Subtotal: ₹${actualSubtotal.toLocaleString('en-IN')}`);
    console.log(`Match: ${Math.abs(expectedResults.subtotal - actualSubtotal) < 1 ? "✅" : "❌"}`);
    
    console.log(`Expected Grand Total: ₹${expectedResults.grandTotal.toLocaleString('en-IN')}`);
    console.log(`Actual Grand Total: ₹${actualGrandTotal.toLocaleString('en-IN')}`);
    console.log(`Match: ${Math.abs(expectedResults.grandTotal - actualGrandTotal) < 1 ? "✅" : "❌"}`);

    return {
      success: true,
      testResults,
      expectedResults,
      matches: {
        subtotal: Math.abs(expectedResults.subtotal - actualSubtotal) < 1,
        grandTotal: Math.abs(expectedResults.grandTotal - actualGrandTotal) < 1
      }
    };

  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other modules
export default {
  testMeterModeQuotation,
  validateExpectedOutput,
  runMeterModeTests
}; 