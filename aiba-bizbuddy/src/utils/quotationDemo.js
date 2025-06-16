/**
 * Quotation Parser Demo
 * Tests the unstructured quotation parser with sample data
 */

import { parseUnstructuredQuotation } from './unstructuredQuotationParser.js';

/**
 * Demo function to test the parser with the exact sample provided
 */
export function demonstrateQuotationParser() {
  console.log("🚀 Demonstrating Unstructured Quotation Parser");
  console.log("=".repeat(60));

  // Your exact sample prompt
  const samplePrompt = `Create quote to SRI ENERGY , VIRALIMALAI. UOM to be in Mtrs. Transport Included Loading Charges included. MS Channel 75 x40 x6mm - 6 MTR Length, 140 Nos. MS Flat 75 x 10mm - 6 MTR, 10 Nos. MS Angle 40x40x6mm - 6 MTR, 35 Nos. MS Flat 50 x 06 mm - 6 MTR, 300 Nos. Add 18% GST`;

  console.log("📝 Input Prompt:");
  console.log(samplePrompt);
  console.log("\n" + "-".repeat(50));

  // Parse the quotation
  const result = parseUnstructuredQuotation(samplePrompt);

  console.log("📊 Parsed Result:");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n" + "-".repeat(50));
  console.log("✅ Expected Output Structure:");
  
  const expectedStructure = {
    customer: "SRI ENERGY",
    location: "VIRALIMALAI", 
    uom: "Metres",
    transport: "Included",
    loadingCharges: "Included",
    items: [
      {
        description: "MS Channel 75x40x6mm",
        length: 6,
        nos: 140,
        total_mtrs: 840,
        rate_per_mtr: "calculated_based_on_weight",
        amount: "total_mtrs × rate_per_mtr"
      },
      "... more items"
    ],
    gst: 18,
    subtotal: "sum_of_all_amounts",
    total: "subtotal + gst"
  };

  console.log(JSON.stringify(expectedStructure, null, 2));

  return result;
}

/**
 * Validate the parsed result against expected structure
 */
export function validateParsedResult(result) {
  const validations = [];

  // Check customer extraction
  if (result.customer === "SRI ENERGY") {
    validations.push("✅ Customer name extracted correctly");
  } else {
    validations.push(`❌ Customer name: expected "SRI ENERGY", got "${result.customer}"`);
  }

  // Check location extraction
  if (result.location === "VIRALIMALAI") {
    validations.push("✅ Location extracted correctly");
  } else {
    validations.push(`❌ Location: expected "VIRALIMALAI", got "${result.location}"`);
  }

  // Check UOM detection
  if (result.uom === "Metres") {
    validations.push("✅ UOM detected correctly as Metres");
  } else {
    validations.push(`❌ UOM: expected "Metres", got "${result.uom}"`);
  }

  // Check transport
  if (result.transport === "Included") {
    validations.push("✅ Transport status extracted correctly");
  } else {
    validations.push(`❌ Transport: expected "Included", got "${result.transport}"`);
  }

  // Check loading charges
  if (result.loadingCharges === "Included") {
    validations.push("✅ Loading charges extracted correctly");
  } else {
    validations.push(`❌ Loading charges: expected "Included", got "${result.loadingCharges}"`);
  }

  // Check GST
  if (result.gst === 18) {
    validations.push("✅ GST extracted correctly");
  } else {
    validations.push(`❌ GST: expected 18, got ${result.gst}`);
  }

  // Check items count
  if (result.items && result.items.length === 4) {
    validations.push("✅ Correct number of items parsed (4)");
  } else {
    validations.push(`❌ Items count: expected 4, got ${result.items?.length || 0}`);
  }

  // Check first item details
  if (result.items && result.items[0]) {
    const firstItem = result.items[0];
    if (firstItem.description.includes("MS Channel") && 
        firstItem.length === 6 && 
        firstItem.nos === 140 && 
        firstItem.total_mtrs === 840) {
      validations.push("✅ First item parsed correctly");
    } else {
      validations.push("❌ First item parsing issues");
    }
  }

  console.log("\n🔍 Validation Results:");
  validations.forEach(validation => console.log(validation));

  return {
    passed: validations.filter(v => v.startsWith("✅")).length,
    failed: validations.filter(v => v.startsWith("❌")).length,
    details: validations
  };
}

/**
 * Generate the expected final JSON output
 */
export function generateExpectedOutput() {
  // Based on section weights data for these items
  const expectedItems = [
    {
      description: "MS Channel 75x40x6mm",
      length: 6,
      nos: 140,
      total_mtrs: 840, // 140 × 6
      rate_per_mtr: 366.18, // Example rate from your specification
      amount: 307593.12 // 840 × 366.18
    },
    {
      description: "MS Flat 75x10mm", 
      length: 6,
      nos: 10,
      total_mtrs: 60, // 10 × 6
      rate_per_mtr: 308.31,
      amount: 18498.60 // 60 × 308.31
    },
    {
      description: "MS Angle 40x40x6mm",
      length: 6, 
      nos: 35,
      total_mtrs: 210, // 35 × 6
      rate_per_mtr: 189.63,
      amount: 39822.30 // 210 × 189.63
    },
    {
      description: "MS Flat 50x06mm",
      length: 6,
      nos: 300, 
      total_mtrs: 1800, // 300 × 6
      rate_per_mtr: 123.12,
      amount: 221616.00 // 1800 × 123.12
    }
  ];

  const subtotal = expectedItems.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal * 1.18; // Adding 18% GST

  const expectedOutput = {
    customer: "SRI ENERGY",
    location: "VIRALIMALAI",
    uom: "Metres", 
    transport: "Included",
    loadingCharges: "Included",
    items: expectedItems,
    gst: 18,
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };

  console.log("\n🎯 Expected Final Output:");
  console.log(JSON.stringify(expectedOutput, null, 2));

  return expectedOutput;
}

/**
 * Run complete demonstration
 */
export function runQuotationDemo() {
  console.log("🎬 Running Complete Quotation Parser Demo");
  console.log("=".repeat(60));

  try {
    // Step 1: Parse the sample
    const parsed = demonstrateQuotationParser();
    
    // Step 2: Validate results
    const validation = validateParsedResult(parsed);
    
    // Step 3: Show expected output
    const expected = generateExpectedOutput();
    
    // Step 4: Summary
    console.log("\n📈 Demo Summary:");
    console.log(`✅ Passed validations: ${validation.passed}`);
    console.log(`❌ Failed validations: ${validation.failed}`);
    console.log(`📊 Success rate: ${Math.round((validation.passed / (validation.passed + validation.failed)) * 100)}%`);

    if (validation.failed === 0) {
      console.log("\n🎉 All validations passed! Parser working correctly.");
    } else {
      console.log("\n⚠️ Some validations failed. Check implementation.");
    }

    return {
      success: validation.failed === 0,
      parsed,
      expected,
      validation
    };

  } catch (error) {
    console.error("❌ Demo failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other modules
export default {
  demonstrateQuotationParser,
  validateParsedResult,
  generateExpectedOutput,
  runQuotationDemo
}; 