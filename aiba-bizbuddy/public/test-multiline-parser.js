/**
 * Test Script for Upgraded Multi-line Parser
 * Tests the new functionality for parsing multi-line product entries
 */

// Test cases for the upgraded parser
const testCases = [
  {
    name: "Basic multi-line with customer at end",
    input: `MS Channel 75x40x6mm
• 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
for ABC Industries`,
    expected: {
      description: "MS Channel 75x40x6mm",
      quantity: 140,
      customerName: "ABC Industries"
    }
  },
  {
    name: "Section rates with product matching",
    input: `Flat - 51+GST
Angle - 50+GST

MS Flat Bar 25x6mm - 100 Nos @ Rs.51
L Angle 50x50x6mm - 75 Nos
for XYZ Construction`,
    expected: {
      sectionRates: { flat: 51, angle: 50 },
      customerName: "XYZ Construction"
    }
  },
  {
    name: "Simple quantity format",
    input: `Quote for 5MT TMT bars @ Rs.58 for Modern Builders`,
    expected: {
      description: "TMT bars",
      quantity: 5,
      rate: 58,
      customerName: "Modern Builders"
    }
  },
  {
    name: "Missing customer name - should ask for clarification",
    input: `5MT TMT bars @ Rs.58`,
    expected: {
      needsClarification: true,
      missingFields: ["customerName"]
    }
  },
  {
    name: "Missing product details - should ask for clarification",
    input: `Quote for ABC Industries`,
    expected: {
      needsClarification: true,
      missingFields: ["products"]
    }
  }
];

// Function to test the parser
async function testMultilineParser() {
  console.log('🧪 Testing Upgraded Multi-line Parser\n');
  
  // Import the parser (for browser testing)
  const promptParser = window.promptParser || await import('../src/utils/promptParser.js').then(m => m.default);
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    
    try {
      const result = promptParser.parsePromptToQuote(testCase.input);
      
      console.log('✅ Parsed Result:', {
        success: result.success !== false,
        needsClarification: result.needsClarification || false,
        customerName: result.customerName,
        products: result.products?.map(p => ({
          description: p.description,
          qty: p.qty,
          uom: p.uom,
          rate: p.rate,
          weight: p.weight,
          rateSource: p.rateSource
        })),
        confidence: result.confidence,
        missingFields: result.missingFields,
        clarificationMessage: result.clarificationMessage
      });
      
      // Validate against expected results
      if (testCase.expected.needsClarification && result.needsClarification) {
        console.log('✅ Correctly identified need for clarification');
      } else if (testCase.expected.customerName && result.customerName?.includes(testCase.expected.customerName)) {
        console.log('✅ Customer name extracted correctly');
      } else if (testCase.expected.description && result.products?.[0]?.description?.includes(testCase.expected.description.split(' ')[0])) {
        console.log('✅ Product description extracted correctly');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  });
}

// Test individual functions
function testSectionRateExtraction() {
  console.log('\n🔍 Testing Section Rate Extraction');
  
  const text = `Flat - 51+GST
Angle - 50+GST
Channel - 50+GST
Sheet - 55+GST`;
  
  // This would need to be called from the parser instance
  console.log('Sample text for section rates:', text);
  console.log('Expected rates: Flat=51, Angle=50, Channel=50, Sheet=55');
}

function testRateInference() {
  console.log('\n🧠 Testing Rate Inference');
  
  const products = [
    { description: "MS Flat Bar 25x6mm", qty: 100, uom: "Nos" },
    { description: "L Angle 50x50x6mm", qty: 75, uom: "Nos" },
    { description: "MS Channel 75x40x6mm", qty: 140, uom: "Nos" },
    { description: "TMT Bars 12mm", qty: 5, uom: "MT" }
  ];
  
  products.forEach(product => {
    console.log(`Product: ${product.description}`);
    console.log(`Expected rate inference based on description...`);
    // Rates would be inferred: Flat=51, Angle=50, Channel=50, TMT=52
  });
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.testMultilineParser = testMultilineParser;
  window.testSectionRateExtraction = testSectionRateExtraction;
  window.testRateInference = testRateInference;
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testMultilineParser, testSectionRateExtraction, testRateInference };
} 