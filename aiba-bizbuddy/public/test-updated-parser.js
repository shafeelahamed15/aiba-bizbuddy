/**
 * Browser Test for Updated Prompt Parser in Vite
 * Open browser console and run: testUpdatedParser()
 */

window.testUpdatedParser = async function() {
  console.log('🧪 Testing Updated Prompt Parser in Vite\n');
  
  try {
    // Test 1: Multi-line product parsing
    console.log('📋 Test 1: Multi-line Product with Customer at End');
    const test1Input = `MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
for ABC Industries`;
    
    // Try to access the parser from the ChatBot component
    const ChatBot = window.React?.createElement ? 'React available' : 'Direct test';
    console.log('Environment:', ChatBot);
    
    // Since we can't directly import in browser, let's simulate the test
    console.log('Input:', test1Input);
    console.log('Expected: Should extract customer "ABC Industries" and product "MS Channel 75x40x6mm"');
    
    // Test 2: Section rates inference
    console.log('\n📋 Test 2: Section Rates with Rate Inference');
    const test2Input = `Flat - 51+GST
Angle - 50+GST

MS Flat Bar 25x6mm - 100 Nos
L Angle 50x50x6mm - 75 Nos
for XYZ Construction`;
    
    console.log('Input:', test2Input);
    console.log('Expected: Should infer Flat=51, Angle=50 rates and apply to products');
    
    // Test 3: Missing customer clarification
    console.log('\n📋 Test 3: Missing Customer - Should Ask for Clarification');
    const test3Input = `5MT TMT bars @ Rs.58`;
    
    console.log('Input:', test3Input);
    console.log('Expected: Should return needsClarification=true for missing customer');
    
    // Test 4: Simple format
    console.log('\n📋 Test 4: Simple Quote Format');
    const test4Input = `Quote for 5MT TMT bars @ Rs.58 for Modern Builders`;
    
    console.log('Input:', test4Input);
    console.log('Expected: Customer="Modern Builders", Product="TMT bars", Qty=5, Rate=58');
    
    console.log('\n✅ Test cases prepared. To actually run with the parser:');
    console.log('1. Open the AIBA app in browser');
    console.log('2. Try typing these test inputs in the chatbot');
    console.log('3. Check if the parsing works as expected');
    
    return {
      test1: test1Input,
      test2: test2Input, 
      test3: test3Input,
      test4: test4Input,
      message: 'Ready to test in chatbot interface'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
};

// Quick test for rate inference logic
window.testRateInference = function() {
  console.log('🧠 Testing Rate Inference Logic');
  
  const products = [
    'MS Flat Bar 25x6mm',
    'L Angle 50x50x6mm', 
    'MS Channel 75x40x6mm',
    'TMT Bars 12mm',
    'HR Sheet 2mm',
    'MS Pipe 25mm',
    'ISMB 150'
  ];
  
  const expectedRates = {
    'flat': 51,
    'angle': 50,
    'channel': 50, 
    'tmt': 52,
    'sheet': 55,
    'pipe': 60,
    'ismb': 70
  };
  
  console.log('Products and expected rate inference:');
  products.forEach(product => {
    const type = product.toLowerCase().includes('flat') ? 'flat' :
                 product.toLowerCase().includes('angle') ? 'angle' :
                 product.toLowerCase().includes('channel') ? 'channel' :
                 product.toLowerCase().includes('tmt') ? 'tmt' :
                 product.toLowerCase().includes('sheet') ? 'sheet' :
                 product.toLowerCase().includes('pipe') ? 'pipe' :
                 product.toLowerCase().includes('ismb') ? 'ismb' : 'unknown';
    
    console.log(`${product} → Expected rate: ${expectedRates[type] || 50}`);
  });
};

// Test customer name extraction
window.testCustomerExtraction = function() {
  console.log('👤 Testing Customer Name Extraction');
  
  const testInputs = [
    'Quote for 5MT TMT bars @ Rs.58 for ABC Industries',
    '5MT TMT bars @ Rs.58 to Modern Builders',
    'Customer: XYZ Construction\n5MT TMT bars @ Rs.58',
    '5MT TMT bars @ Rs.58', // Should fail and ask for clarification
  ];
  
  testInputs.forEach((input, index) => {
    console.log(`\nTest ${index + 1}: "${input}"`);
    if (input.includes('for ') || input.includes('to ')) {
      const match = input.match(/(?:for|to)\s+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i);
      console.log('Expected customer:', match ? match[1].trim() : 'Not found');
    } else if (input.includes('Customer:')) {
      const match = input.match(/customer[:\s]+([^@\d\n]+?)(?:\s*$|\s*[.\n])/i);
      console.log('Expected customer:', match ? match[1].trim() : 'Not found');
    } else {
      console.log('Expected: Should ask for clarification');
    }
  });
};

console.log('🔧 Updated Parser Tests Loaded!');
console.log('Available functions:');
console.log('- testUpdatedParser()');
console.log('- testRateInference()'); 
console.log('- testCustomerExtraction()');
console.log('\nRun any of these in the browser console to test!'); 