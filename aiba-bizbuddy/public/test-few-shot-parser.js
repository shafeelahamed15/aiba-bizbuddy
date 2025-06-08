/**
 * Test Few-Shot Prompt Parser in Browser
 * Tests the new OpenAI-enhanced parsing with examples
 */

window.testFewShotParser = async function() {
  console.log('🧪 Testing Few-Shot Prompt Parser\n');
  
  const testCases = [
    {
      name: "Complex Multi-line Channel",
      input: `MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
for ABC Industries`,
      expectedAI: true,
      expected: {
        customerName: "ABC Industries",
        products: [{
          description: "MS Channel 75x40x6mm",
          quantity: 140,
          weight: 5992.8,
          inferredSection: "CHANNEL"
        }]
      }
    },
    {
      name: "Section Rates with Mixed Products",
      input: `Flat - 51+GST
ANGLE AND CHANNEL – 50₹ + GST

MS Flat Bar 25x6mm - 100 Nos
L Angle 50x50x6mm - 75 Nos
MS Channel 100x50x6mm - 200 Nos
for XYZ Construction`,
      expectedAI: false, // Should use regex
      expected: {
        sectionRates: { flat: 51, angle: 50, channel: 50 },
        customerName: "XYZ Construction",
        products: 3
      }
    },
    {
      name: "Simple TMT Format",
      input: `Quote for 5MT TMT bars @ Rs.58 for Modern Builders`,
      expectedAI: false, // Simple format, regex should handle
      expected: {
        customerName: "Modern Builders",
        products: [{
          description: "TMT bars",
          quantity: 5,
          rate: 58
        }]
      }
    },
    {
      name: "Missing Customer - Should Ask Clarification",
      input: `MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg`,
      expected: {
        needsClarification: true,
        missingFields: ["customerName"]
      }
    }
  ];
  
  console.log('Test cases prepared:');
  testCases.forEach((test, i) => {
    console.log(`\n📋 Test ${i+1}: ${test.name}`);
    console.log(`Input: "${test.input}"`);
    console.log(`Expected AI processing: ${test.expectedAI ? 'Yes' : 'No/Fallback'}`);
    
    // Check if it should trigger AI processing
    const hasComplexFormat = (
      test.input.includes('•') && test.input.includes('×') && test.input.includes('=')
    ) || (
      test.input.includes('kg/m')
    ) || (
      test.input.split('\n').length > 2
    );
    
    console.log(`Has complex format indicators: ${hasComplexFormat}`);
    
    if (test.expected.needsClarification) {
      console.log('Expected: Should request clarification for missing customer');
    } else {
      console.log('Expected: Should parse successfully');
    }
  });
  
  console.log('\n✅ To test these with actual parser:');
  console.log('1. Type these inputs in the AIBA chatbot');
  console.log('2. Watch browser console for parsing logs');
  console.log('3. Check if AI parsing is triggered vs regex fallback');
  console.log('4. Verify PDF generation is never blocked');
  
  return { testCases, message: 'Ready to test in chatbot' };
};

// Test the prompt building logic
window.testPromptBuilding = function() {
  console.log('🔨 Testing Few-Shot Prompt Building');
  
  const userInput = `MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
for ABC Industries`;
  
  // Simulate prompt building
  const fewShotPrompt = `You are a quotation assistant. Extract all steel products from the given user message and return a JSON array of objects with the following keys:

- description (string)
- quantity (number)
- uom (unit of measurement, like 'Nos', 'Kg', 'MT', etc.)
- weight (number, if available)
- rate (number, if available)
- length (string, if mentioned like "6 m")
- inferredSection (string, like "CHANNEL", "FLAT", "ANGLE", "TMT", "SHEET", "PIPE", etc.)

Each product can span multiple lines. Here are examples:

**Example 1:**
Input:
1. MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg

Output:
[
  {
    "description": "MS Channel 75x40x6mm",
    "quantity": 140,
    "uom": "Nos",
    "weight": 5992.8,
    "length": "6 m",
    "rate": 50,
    "inferredSection": "CHANNEL"
  }
]

Now extract products from this input:

${userInput}`;
  
  console.log('📝 Generated Few-Shot Prompt:');
  console.log('Length:', fewShotPrompt.length, 'characters');
  console.log('Contains examples:', fewShotPrompt.includes('**Example 1:**'));
  console.log('Contains section mapping:', fewShotPrompt.includes('inferredSection'));
  console.log('Contains user input:', fewShotPrompt.includes(userInput));
  
  console.log('\n🤖 This prompt would be sent to OpenAI to get structured JSON response');
  
  return fewShotPrompt;
};

// Test rate inference improvements
window.testRateInferenceV2 = function() {
  console.log('🧠 Testing Enhanced Rate Inference');
  
  const sampleText = `Flat - 51+GST
ANGLE AND CHANNEL – 50₹ + GST
TMT: 52
Sheet - 55`;
  
  console.log('Sample section rates text:', sampleText);
  console.log('\nExpected parsing:');
  console.log('- Flat: 51');
  console.log('- Angle: 50');
  console.log('- Channel: 50'); 
  console.log('- TMT: 52');
  console.log('- Sheet: 55');
  
  console.log('\n✅ Enhanced patterns should handle:');
  console.log('- Different separators (-, –, :)');
  console.log('- Currency symbols (₹)');
  console.log('- GST mentions (+GST)');
  console.log('- Combined rates (ANGLE AND CHANNEL)');
  
  const products = [
    'MS Flat Bar 25x6mm',
    'L Angle 50x50x6mm',
    'MS Channel 100x50x6mm',
    'TMT Bars 12mm',
    'HR Sheet 2mm'
  ];
  
  console.log('\nRate mapping for products:');
  products.forEach(product => {
    let expectedRate = 50; // default
    if (product.toLowerCase().includes('flat')) expectedRate = 51;
    if (product.toLowerCase().includes('angle')) expectedRate = 50;
    if (product.toLowerCase().includes('channel')) expectedRate = 50;
    if (product.toLowerCase().includes('tmt')) expectedRate = 52;
    if (product.toLowerCase().includes('sheet')) expectedRate = 55;
    
    console.log(`${product} → Rate: ${expectedRate}`);
  });
};

console.log('🎯 Few-Shot Parser Tests Loaded!');
console.log('Available functions:');
console.log('- testFewShotParser()');
console.log('- testPromptBuilding()');
console.log('- testRateInferenceV2()');
console.log('\nRun any of these in the browser console!'); 