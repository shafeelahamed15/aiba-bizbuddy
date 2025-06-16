/**
 * Simple Enhanced Intent Detection Test
 * Tests the enhanced intent detection function in isolation
 */

// Standalone implementation of the detectIntentFromPrompt function
function detectIntentFromPrompt(prompt) {
  const lower = prompt.toLowerCase();

  // Purchase Order Detection
  if (
    lower.includes("purchase order") ||
    lower.includes("create po") ||
    lower.includes("generate po") ||
    lower.includes("make po") ||
    lower.includes("order to") ||
    lower.includes("raise po") ||
    lower.includes("send po") ||
    lower.includes("new po") ||
    lower.includes("po for") ||
    lower.includes("purchase order for")
  ) {
    return "purchase_order";
  }

  // Quotation Detection
  if (
    lower.includes("quotation") ||
    lower.includes("quote") ||
    lower.includes("generate quotation") ||
    lower.includes("send quote") ||
    lower.includes("create quotation") ||
    lower.includes("quote for") ||
    lower.includes("quotation for") ||
    lower.includes("price quote") ||
    lower.includes("estimate")
  ) {
    return "quotation";
  }

  return "unknown";
}

// Test Cases
const testCases = [
  // Purchase Order Tests
  { input: "Create purchase order for steel supplies", expected: "purchase_order" },
  { input: "I need to create PO for TMT bars", expected: "purchase_order" },
  { input: "Generate PO for 5MT steel", expected: "purchase_order" },
  { input: "Make PO for HR Sheet 3mm", expected: "purchase_order" },
  { input: "Send PO to supplier", expected: "purchase_order" },
  { input: "Raise PO for inventory", expected: "purchase_order" },
  { input: "New PO needed", expected: "purchase_order" },
  { input: "PO for steel materials", expected: "purchase_order" },
  
  // Quotation Tests
  { input: "Create quotation for XYZ Company", expected: "quotation" },
  { input: "I need a quote for 5MT TMT bars", expected: "quotation" },
  { input: "Generate quotation for steel", expected: "quotation" },
  { input: "Send quote to customer", expected: "quotation" },
  { input: "Price quote needed", expected: "quotation" },
  { input: "Need estimate for steel beams", expected: "quotation" },
  { input: "Quote for ISMB 200", expected: "quotation" },
  { input: "Quotation for multiple items", expected: "quotation" },
  
  // Unknown Tests  
  { input: "What's the difference between TMT and MS bars?", expected: "unknown" },
  { input: "Hello, how are you?", expected: "unknown" },
  { input: "Show me steel rates", expected: "unknown" },
  { input: "Help with calculations", expected: "unknown" }
];

// Run Tests
function runTests() {
  console.log("🎯 ENHANCED INTENT DETECTION TEST");
  console.log("=".repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((test, index) => {
    const result = detectIntentFromPrompt(test.input);
    const success = result === test.expected;
    
    console.log(`\nTest ${index + 1}: ${success ? '✅' : '❌'}`);
    console.log(`Input: "${test.input}"`);
    console.log(`Expected: ${test.expected}, Got: ${result}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passed} (${((passed/testCases.length)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed/testCases.length)*100).toFixed(1)}%)`);
  
  return { passed, failed, total: testCases.length };
}

// Demo Function
function demonstrateIntentDetection() {
  console.log("\n🎭 INTENT DETECTION DEMONSTRATION");
  console.log("=".repeat(50));
  
  const examples = [
    "Create purchase order for 10MT TMT bars from Rajam Steel",
    "I need a quotation for HR Sheet 3mm - 5MT @ ₹58/kg", 
    "Generate PO for steel delivery to construction site",
    "Quote for ISMB 150 - 3MT due by 15th June"
  ];
  
  examples.forEach((example, index) => {
    const intent = detectIntentFromPrompt(example);
    console.log(`\n${index + 1}. "${example}"`);
    console.log(`   → Intent: ${intent}`);
    console.log(`   → Flow: ${intent === 'purchase_order' ? '🛒 Purchase Order' : intent === 'quotation' ? '📋 Quotation' : '❓ General Chat'}`);
  });
}

// Integration Simulation
function simulateMessageRouting() {
  console.log("\n🔄 MESSAGE ROUTING SIMULATION");
  console.log("=".repeat(50));
  
  const userInputs = [
    "I need to create a purchase order for steel supplies",
    "Generate quotation for TMT bars to XYZ Company",
    "What's the current market rate for steel?"
  ];
  
  userInputs.forEach((input, index) => {
    console.log(`\n📬 Message ${index + 1}: "${input}"`);
    
    const intent = detectIntentFromPrompt(input);
    console.log(`Step 1 - Intent Detection: ${intent}`);
    
    if (intent === "purchase_order") {
      console.log("Step 2 - Route to: Purchase Order Flow");
      console.log("Step 3 - Action: Start 10-step PO creation");
      console.log("Step 4 - Next: Collect supplier information");
    } else if (intent === "quotation") {
      console.log("Step 2 - Route to: Quotation Flow");
      console.log("Step 3 - Action: Start quotation creation");
      console.log("Step 4 - Next: Customer selection or item input");
    } else {
      console.log("Step 2 - Route to: General Chat Handler");
      console.log("Step 3 - Action: Process as knowledge query");
      console.log("Step 4 - Next: Provide information or help");
    }
  });
}

// Main execution
console.log("🚀 STARTING ENHANCED INTENT DETECTION TESTS\n");

const results = runTests();
demonstrateIntentDetection();
simulateMessageRouting();

console.log("\n🎉 ALL TESTS COMPLETED!");
console.log(`Final Success Rate: ${((results.passed/results.total)*100).toFixed(1)}%`);

if (results.passed === results.total) {
  console.log("✨ Perfect Score! Enhanced Intent Detection is working flawlessly.");
} else {
  console.log(`⚠️  ${results.failed} test(s) failed. Review implementation.`);
} 