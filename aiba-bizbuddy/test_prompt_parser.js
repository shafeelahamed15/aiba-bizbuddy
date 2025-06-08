/**
 * Test Prompt Parser Functionality
 * Run this file to test if the new prompt parser is working correctly
 */

// Import the prompt parser
import promptParser from './src/utils/promptParser.js';

console.log('🧪 Testing Prompt Parser System...\n');

// Test cases
const testCases = [
  "Quote to ABC Constructions: ISMB 150 - 45 Nos @ ₹75 + GST",
  "QUOTE TO SRI RAMA VILAS: 10MM TMT BARS - 15 MT - 49.5 + GST. PAYMENT TERMS: Against Invoice",
  "Quote for Swastik Industries: TMT 10mm - 5MT @ ₹55/kg. GST 12%. Transport: Extra",
  "Create quotation for XYZ Steel: MS Pipe 25mm - 100nos @ ₹120. Payment: 50% advance"
];

testCases.forEach((testCase, index) => {
  console.log(`\n📝 Test Case ${index + 1}:`);
  console.log(`Input: "${testCase}"`);
  
  try {
    const result = promptParser.parsePromptToQuote(testCase);
    
    console.log('✅ Parsed Result:');
    console.log(`  Customer: ${result.customerName}`);
    console.log(`  Products: ${result.products.length} items`);
    result.products.forEach((product, i) => {
      console.log(`    ${i + 1}. ${product.description} - ${product.qty} ${product.uom} @ ₹${product.rate}`);
    });
    console.log(`  GST: ${result.gst}%`);
    console.log(`  Transport: ${result.transport}`);
    console.log(`  Payment Terms: ${result.paymentTerms}`);
    console.log(`  Confidence: ${result.confidence}%`);
    
    // Validate the result
    const validation = promptParser.validateResult(result);
    console.log(`  Validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!validation.isValid) {
      console.log(`  Issues: ${validation.issues.join(', ')}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('-'.repeat(50));
});

console.log('\n🎯 Testing Training Data...');
try {
  const trainingResults = promptParser.testWithTrainingData();
  console.log(`✅ Processed ${trainingResults.length} training samples`);
  
  const validResults = trainingResults.filter(r => r.validation.isValid);
  console.log(`✅ Valid parses: ${validResults.length}/${trainingResults.length}`);
  
  const avgConfidence = trainingResults.reduce((sum, r) => sum + r.confidence, 0) / trainingResults.length;
  console.log(`📊 Average confidence: ${avgConfidence.toFixed(1)}%`);
  
} catch (error) {
  console.log('❌ Training test error:', error.message);
}

console.log('\n✅ Prompt Parser Test Complete!'); 