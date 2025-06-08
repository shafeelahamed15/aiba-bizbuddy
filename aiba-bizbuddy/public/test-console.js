/**
 * Console Test Script for AIBA New Features
 * Paste this into your browser console (F12) to test the new implementations
 */

console.log('🧪 AIBA Feature Test Script Loading...');

// Test function to verify prompt parser
async function testPromptParser() {
  console.log('\n🧠 Testing Prompt Parser...');
  
  const testCases = [
    "Quote to ABC Constructions: ISMB 150 - 45 Nos @ ₹75 + GST",
    "QUOTE TO SRI RAMA VILAS: 10MM TMT BARS - 15 MT @ ₹49.5 + GST. PAYMENT TERMS: Against Invoice",
    "Quote for Swastik Industries: TMT 10mm - 5MT @ ₹55/kg. GST 12%. Transport: Extra",
    "Create quotation for XYZ Company" // Should have low confidence
  ];
  
  if (typeof promptParser !== 'undefined') {
    testCases.forEach((testCase, index) => {
      console.log(`\n📝 Test ${index + 1}: "${testCase}"`);
      try {
        const result = promptParser.parsePromptToQuote(testCase);
        console.log('✅ Result:', {
          customer: result.customerName,
          products: result.products.length,
          confidence: result.confidence + '%',
          gst: result.gst + '%',
          valid: result.customerName !== "Not specified" && result.products.length > 0
        });
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    });
  } else {
    console.log('❌ promptParser not available. Check imports in ChatBot.jsx');
  }
}

// Test function to verify state manager
function testStateManager() {
  console.log('\n🎯 Testing State Manager...');
  
  if (typeof chatbotStateManager !== 'undefined') {
    // Get current state
    const currentState = chatbotStateManager.getStateSummary();
    console.log('📊 Current State:', currentState);
    
    // Test routing
    const testMessages = [
      "Quote to ABC Steel",
      "Create quotation",
      "What is TMT?",
      "Hello",
      "yes"
    ];
    
    testMessages.forEach(message => {
      const routing = chatbotStateManager.routeMessage(message);
      console.log(`📨 "${message}" → Action: ${routing.action}, Intent: ${routing.intent}`);
    });
    
    // Reset state
    chatbotStateManager.reset();
    console.log('🔄 State reset to initial');
  } else {
    console.log('❌ chatbotStateManager not available. Check imports in ChatBot.jsx');
  }
}

// Test function to verify suggestion manager
function testSuggestionManager() {
  console.log('\n💡 Testing Suggestion Manager...');
  
  if (typeof suggestionManager !== 'undefined') {
    // Test customer suggestions
    const customerSuggestions = suggestionManager.getSuggestions(
      { currentField: 'customerName' },
      'ABC'
    );
    console.log('🏢 Customer suggestions for "ABC":', customerSuggestions.items.length, 'items');
    
    // Test product suggestions
    const productSuggestions = suggestionManager.getSuggestions(
      { currentField: 'productDescription' },
      'TMT'
    );
    console.log('🔩 Product suggestions for "TMT":', productSuggestions.items.length, 'items');
    
    // Test UOM suggestions
    const uomSuggestions = suggestionManager.getSuggestions(
      { currentField: 'uom', productDescription: 'TMT Bars' },
      ''
    );
    console.log('📏 UOM suggestions:', uomSuggestions.items.length, 'items');
    
    console.log('📈 Suggestion Stats:', suggestionManager.getSuggestionStats());
  } else {
    console.log('❌ suggestionManager not available. Check imports in ChatBot.jsx');
  }
}

// Comprehensive test function
function runAllTests() {
  console.log('🚀 Running Comprehensive AIBA Feature Tests...');
  console.log('='.repeat(50));
  
  testPromptParser();
  testStateManager();
  testSuggestionManager();
  
  console.log('\n✅ All tests completed! Check results above.');
  console.log('💡 If any component shows "not available", check browser network tab for import errors.');
}

// Utility function to test a specific quotation
function testQuote(input) {
  console.log(`\n🧪 Testing specific quote: "${input}"`);
  
  if (typeof promptParser !== 'undefined') {
    const result = promptParser.parsePromptToQuote(input);
    console.table({
      'Customer': result.customerName,
      'Products': result.products.length,
      'Confidence': result.confidence + '%',
      'GST': result.gst + '%',
      'Transport': result.transport,
      'Payment': result.paymentTerms
    });
    
    if (result.products.length > 0) {
      console.log('📦 Products:');
      result.products.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.description} - ${product.qty} ${product.uom} @ ₹${product.rate}`);
      });
    }
  } else {
    console.log('❌ promptParser not available');
  }
}

// Make functions available globally
window.testPromptParser = testPromptParser;
window.testStateManager = testStateManager;
window.testSuggestionManager = testSuggestionManager;
window.runAllTests = runAllTests;
window.testQuote = testQuote;

console.log('✅ Console test functions loaded!');
console.log('\n📋 Available commands:');
console.log('  runAllTests()        - Run all feature tests');
console.log('  testPromptParser()   - Test prompt parsing only');
console.log('  testStateManager()   - Test state management only');
console.log('  testSuggestionManager() - Test suggestion system only');
console.log('  testQuote("your quote here") - Test specific quotation');
console.log('\n🎯 Quick start: runAllTests()'); 