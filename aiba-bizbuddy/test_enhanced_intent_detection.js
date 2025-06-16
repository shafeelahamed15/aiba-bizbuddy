/**
 * Enhanced Intent Detection System Test
 * Tests the new intent detection that specifically identifies quotation vs purchase order requests
 */

// Import the enhanced intent detection function
import { detectIntentFromPrompt } from './src/utils/intentRouter.js';

// Test Cases for Enhanced Intent Detection
const testCases = [
  // 🛒 PURCHASE ORDER TEST CASES
  {
    input: "Create purchase order for steel supplies",
    expected: "purchase_order",
    description: "Direct purchase order creation command"
  },
  {
    input: "I need to create PO for TMT bars",
    expected: "purchase_order",
    description: "Create PO with abbreviated form"
  },
  {
    input: "Generate PO for 5MT steel to Rajam Steel Traders",
    expected: "purchase_order",
    description: "Generate PO command with details"
  },
  {
    input: "Make PO for HR Sheet 3mm",
    expected: "purchase_order",
    description: "Make PO command"
  },
  {
    input: "Need to send PO to supplier for steel delivery",
    expected: "purchase_order",
    description: "Send PO context"
  },
  {
    input: "Raise PO for inventory replenishment",
    expected: "purchase_order",
    description: "Raise PO command"
  },
  {
    input: "Purchase order for ISMB 150 - 3MT",
    expected: "purchase_order",
    description: "Purchase order with item details"
  },
  {
    input: "New PO needed for upcoming project",
    expected: "purchase_order",
    description: "New PO request"
  },
  {
    input: "PO for steel materials required",
    expected: "purchase_order",
    description: "PO for materials"
  },
  {
    input: "Purchase order for ABC Steel Industries",
    expected: "purchase_order",
    description: "Purchase order for specific company"
  },

  // 📋 QUOTATION TEST CASES
  {
    input: "Create quotation for XYZ Company",
    expected: "quotation",
    description: "Direct quotation creation command"
  },
  {
    input: "I need a quote for 5MT TMT bars",
    expected: "quotation",
    description: "Quote request with details"
  },
  {
    input: "Generate quotation for steel supplies",
    expected: "quotation",
    description: "Generate quotation command"
  },
  {
    input: "Send quote to customer for HR sheets",
    expected: "quotation",
    description: "Send quote request"
  },
  {
    input: "Price quote needed for construction project",
    expected: "quotation",
    description: "Price quote request"
  },
  {
    input: "Quotation for TMT 12mm - 10MT @ ₹55/kg",
    expected: "quotation",
    description: "Quotation with detailed specifications"
  },
  {
    input: "Create quotation for Swastik Industries",
    expected: "quotation",
    description: "Create quotation for specific customer"
  },
  {
    input: "Need estimate for steel beams delivery",
    expected: "quotation",
    description: "Estimate request"
  },
  {
    input: "Quote for ISMB 200 - 5MT delivery to Chennai",
    expected: "quotation",
    description: "Quote with delivery location"
  },
  {
    input: "Quotation for multiple steel items",
    expected: "quotation",
    description: "Multiple items quotation"
  },

  // ❓ UNKNOWN/AMBIGUOUS TEST CASES
  {
    input: "What's the difference between TMT and MS bars?",
    expected: "unknown",
    description: "Knowledge question"
  },
  {
    input: "Hello, how are you?",
    expected: "unknown",
    description: "Casual greeting"
  },
  {
    input: "Show me the current steel rates",
    expected: "unknown",
    description: "Information request"
  },
  {
    input: "Help me with steel calculations",
    expected: "unknown",
    description: "General help request"
  },
  {
    input: "Update customer details",
    expected: "unknown",
    description: "Edit/update command"
  }
];

// Enhanced Intent Detection Test Function
function testEnhancedIntentDetection() {
  console.log("🎯 ENHANCED INTENT DETECTION SYSTEM TEST");
  console.log("=" .repeat(60));
  
  let totalTests = testCases.length;
  let passedTests = 0;
  let failedTests = [];

  testCases.forEach((testCase, index) => {
    console.log(`\n📝 Test ${index + 1}: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    
    try {
      const result = detectIntentFromPrompt(testCase.input);
      console.log(`Expected: ${testCase.expected}`);
      console.log(`Got: ${result}`);
      
      if (result === testCase.expected) {
        console.log("✅ PASS");
        passedTests++;
      } else {
        console.log("❌ FAIL");
        failedTests.push({
          test: index + 1,
          input: testCase.input,
          expected: testCase.expected,
          actual: result,
          description: testCase.description
        });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failedTests.push({
        test: index + 1,
        input: testCase.input,
        expected: testCase.expected,
        actual: 'ERROR',
        description: testCase.description,
        error: error.message
      });
    }
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests.length} (${((failedTests.length/totalTests)*100).toFixed(1)}%)`);
  
  if (failedTests.length > 0) {
    console.log("\n❌ FAILED TESTS:");
    failedTests.forEach(failure => {
      console.log(`  ${failure.test}. ${failure.description}`);
      console.log(`     Input: "${failure.input}"`);
      console.log(`     Expected: ${failure.expected}, Got: ${failure.actual}`);
      if (failure.error) {
        console.log(`     Error: ${failure.error}`);
      }
    });
  }

  return {
    totalTests,
    passedTests,
    failedTests: failedTests.length,
    successRate: ((passedTests/totalTests)*100).toFixed(1)
  };
}

// Demonstration of Intent Detection in Action
function demonstrateIntentDetection() {
  console.log("\n🎭 INTENT DETECTION DEMONSTRATION");
  console.log("=".repeat(60));
  
  const demoInputs = [
    "Create purchase order for 10MT TMT bars from Rajam Steel",
    "I need a quotation for HR Sheet 3mm - 5MT @ ₹58/kg",
    "Generate PO for steel delivery to construction site",
    "Quote for ISMB 150 - 3MT due by 15th June",
    "New purchase order for inventory replenishment",
    "Create quotation for ABC Industries - multiple items"
  ];

  demoInputs.forEach((input, index) => {
    console.log(`\n🎯 Demo ${index + 1}:`);
    console.log(`Input: "${input}"`);
    
    const intent = detectIntentFromPrompt(input);
    
    let flowType;
    if (intent === "purchase_order") {
      flowType = "🛒 Purchase Order Flow";
    } else if (intent === "quotation") {
      flowType = "📋 Quotation Flow";
    } else {
      flowType = "❓ General Chat Flow";
    }
    
    console.log(`Intent: ${intent}`);
    console.log(`Action: ${flowType}`);
  });
}

// Integration Test Simulation
function simulateIntegrationFlow() {
  console.log("\n🔄 INTEGRATION FLOW SIMULATION");
  console.log("=".repeat(60));
  
  const userInputs = [
    "I need to create a purchase order for steel supplies",
    "Generate quotation for TMT bars to XYZ Company"
  ];

  userInputs.forEach((input, index) => {
    console.log(`\n🎬 Scenario ${index + 1}:`);
    console.log(`User Input: "${input}"`);
    
    // Step 1: Intent Detection
    const intent = detectIntentFromPrompt(input);
    console.log(`Step 1 - Intent Detected: ${intent}`);
    
    // Step 2: Flow Routing
    if (intent === "purchase_order") {
      console.log("Step 2 - Routing to: handlePurchaseOrderFlow()");
      console.log("Step 3 - Action: Start 10-step purchase order creation");
      console.log("Step 4 - Expected: Supplier info collection begins");
    } else if (intent === "quotation") {
      console.log("Step 2 - Routing to: handleQuotationFlow()");
      console.log("Step 3 - Action: Start quotation creation process");
      console.log("Step 4 - Expected: Customer selection or item input begins");
    } else {
      console.log("Step 2 - Routing to: handleGeneralChat()");
      console.log("Step 3 - Action: Process as general conversation");
      console.log("Step 4 - Expected: Contextual response or help menu");
    }
  });
}

// Performance Test
function performanceTest() {
  console.log("\n⚡ PERFORMANCE TEST");
  console.log("=".repeat(60));
  
  const testInput = "Create purchase order for steel supplies";
  const iterations = 1000;
  
  console.log(`Testing: "${testInput}"`);
  console.log(`Iterations: ${iterations}`);
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    detectIntentFromPrompt(testInput);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average Time per Detection: ${avgTime.toFixed(4)}ms`);
  console.log(`Performance: ${avgTime < 1 ? '✅ Excellent' : avgTime < 5 ? '✅ Good' : '⚠️ Needs Optimization'}`);
}

// Main Execution
export function runEnhancedIntentDetectionTests() {
  console.log("🚀 STARTING ENHANCED INTENT DETECTION TESTS");
  console.log("="
    .repeat(60));
  
  // Run all tests
  const testResults = testEnhancedIntentDetection();
  demonstrateIntentDetection();
  simulateIntegrationFlow();
  performanceTest();
  
  console.log("\n🎉 ALL TESTS COMPLETED!");
  console.log(`Final Success Rate: ${testResults.successRate}%`);
  
  return testResults;
}

// Export for use in other modules
export {
  testEnhancedIntentDetection,
  demonstrateIntentDetection,
  simulateIntegrationFlow,
  performanceTest
};

// If running directly in Node.js
if (typeof require !== 'undefined' && require.main === module) {
  runEnhancedIntentDetectionTests();
} 