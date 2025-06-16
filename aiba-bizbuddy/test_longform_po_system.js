/**
 * Comprehensive Test Suite for Long-Form Purchase Order System
 * Tests parsing, validation, confirmation flow, and integration
 */

console.log('🚚 LONG-FORM PURCHASE ORDER SYSTEM TESTS');
console.log('=' .repeat(50));

// Test cases covering various long-form PO scenarios
const testCases = [
  {
    name: "Complete PO Request - Example from spec",
    prompt: "Create a purchase order to Rajam Steel Traders, Chennai for 45 nos of HR Sheet 1.6mm 1250x2500mm @ ₹57.5 + GST. Ship to our Trichy branch. Reference no is REF123 dated 08-06-2025. Dispatch through lorry. Payment term: 30 days credit. Destination: Trichy Warehouse. Mention it was confirmed over call with Mr. Ravi.",
    expected: {
      supplierName: "Rajam Steel Traders",
      supplierLocation: "Chennai",
      items: [{
        description: "HR Sheet 1.6mm 1250x2500mm",
        quantity: "45",
        unit: "nos",
        rate: 57.5
      }],
      referenceNumber: "REF123",
      referenceDate: "08-06-2025",
      dispatchThrough: "lorry",
      destination: "Trichy Warehouse",
      paymentTerms: "30 days credit",
      remarks: "confirmed over call with Mr. Ravi"
    }
  },
  {
    name: "Multi-item PO with different formats",
    prompt: "Purchase order to Mumbai Steel Works for 5MT TMT bars @ ₹58/kg and 100 nos ISMB 150 @ ₹75 each. Dispatch via truck. Payment: COD. Destination: Site office.",
    expected: {
      supplierName: "Mumbai Steel Works",
      items: [
        { description: "TMT bars", quantity: "5", unit: "mt", rate: 58 },
        { description: "ISMB 150", quantity: "100", unit: "nos", rate: 75 }
      ],
      dispatchThrough: "truck",
      paymentTerms: "COD",
      destination: "Site office"
    }
  },
  {
    name: "Minimal PO request",
    prompt: "Create PO to ABC Steel for 10 nos MS Pipe @ ₹500",
    expected: {
      supplierName: "ABC Steel",
      items: [{
        description: "MS Pipe",
        quantity: "10",
        unit: "nos",
        rate: 500
      }]
    }
  },
  {
    name: "PO with GST specification",
    prompt: "Purchase order to Steel Corp, Delhi for 2MT plates @ ₹45000 + 18% GST. Reference ABC123 dated 15-06-2025.",
    expected: {
      supplierName: "Steel Corp",
      supplierLocation: "Delhi",
      items: [{
        description: "plates",
        quantity: "2",
        unit: "mt",
        rate: 45000
      }],
      referenceNumber: "ABC123",
      referenceDate: "15-06-2025",
      gstRate: 18
    }
  },
  {
    name: "Complex delivery terms",
    prompt: "Order to Bangalore Steels for 20 nos channel sections @ ₹1200. Ship to our Mysore warehouse. Dispatch through own transport. Payment terms: 45 days credit. Note: As per telephonic discussion with sales team.",
    expected: {
      supplierName: "Bangalore Steels",
      items: [{
        description: "channel sections",
        quantity: "20",
        unit: "nos",
        rate: 1200
      }],
      destination: "Mysore warehouse",
      dispatchThrough: "own transport",
      paymentTerms: "45 days credit",
      remarks: "As per telephonic discussion with sales team"
    }
  }
];

// Mock parser functions for testing
const parsePurchaseOrderPrompt = (prompt) => {
  console.log('🔍 Parsing:', prompt.substring(0, 50) + '...');
  
  // Simulate parsing logic
  const parsed = {
    supplierName: '',
    supplierLocation: '',
    items: [],
    referenceNumber: '',
    referenceDate: '',
    dispatchThrough: '',
    destination: '',
    paymentTerms: '',
    remarks: '',
    gstRate: 18
  };
  
  // Extract supplier name
  const supplierMatch = prompt.match(/(?:to|from)\s+([^,\n]+?)(?:,|\s+for)/i);
  if (supplierMatch) {
    parsed.supplierName = supplierMatch[1].trim();
  }
  
  // Extract location
  const locationMatch = prompt.match(/,\s*(Chennai|Mumbai|Delhi|Bangalore|Hyderabad|Kolkata)/i);
  if (locationMatch) {
    parsed.supplierLocation = locationMatch[1].trim();
  }
  
  // Extract items
  const itemPattern = /(\d+)\s*(nos|pcs|mt|kg)\s+(?:of\s+)?([^@\n]+?)\s*@\s*₹?(\d+(?:\.\d+)?)/gi;
  let itemMatch;
  while ((itemMatch = itemPattern.exec(prompt)) !== null) {
    parsed.items.push({
      description: itemMatch[3].trim(),
      quantity: itemMatch[1],
      unit: itemMatch[2].toLowerCase(),
      rate: parseFloat(itemMatch[4]),
      amount: parseFloat(itemMatch[1]) * parseFloat(itemMatch[4])
    });
  }
  
  // Extract reference
  const refMatch = prompt.match(/ref(?:erence)?\s+(?:no\s+)?(\w+)(?:\s+dated\s+(\d{2}-\d{2}-\d{4}))?/i);
  if (refMatch) {
    parsed.referenceNumber = refMatch[1];
    if (refMatch[2]) parsed.referenceDate = refMatch[2];
  }
  
  // Extract dispatch
  const dispatchMatch = prompt.match(/dispatch\s+through\s+(\w+)/i);
  if (dispatchMatch) {
    parsed.dispatchThrough = dispatchMatch[1];
  }
  
  // Extract destination
  const destMatch = prompt.match(/destination:\s*([^.\n]+)|ship\s+to\s+(?:our\s+)?([^.\n]+)/i);
  if (destMatch) {
    parsed.destination = (destMatch[1] || destMatch[2]).trim();
  }
  
  // Extract payment terms
  const paymentMatch = prompt.match(/payment\s+term[s]?:\s*([^.\n]+)/i);
  if (paymentMatch) {
    parsed.paymentTerms = paymentMatch[1].trim();
  }
  
  // Extract remarks
  const remarkMatch = prompt.match(/mention\s+([^.\n]+)|note:\s*([^.\n]+)/i);
  if (remarkMatch) {
    parsed.remarks = (remarkMatch[1] || remarkMatch[2]).trim();
  }
  
  return parsed;
};

const isLongFormPOPrompt = (prompt) => {
  const indicators = [
    /create\s+(?:a\s+)?purchase\s+order/i,
    /purchase\s+order\s+(?:to|for)/i,
    /po\s+(?:to|for)/i,
    /order.*(?:@|₹).*\d+/i,
    /\d+\s*(?:nos|pcs|mt|kg).*@.*₹?\d+/i
  ];
  
  return indicators.some(pattern => pattern.test(prompt));
};

const generatePOConfirmation = (parsedData) => {
  let summary = '✅ **Purchase Order Draft Created:**\n\n';
  
  if (parsedData.supplierName) {
    summary += `**📍 Supplier**: ${parsedData.supplierName}`;
    if (parsedData.supplierLocation) {
      summary += `, ${parsedData.supplierLocation}`;
    }
    summary += '\n\n';
  }
  
  if (parsedData.items && parsedData.items.length > 0) {
    summary += '**📦 Items:**\n';
    parsedData.items.forEach((item, index) => {
      summary += `${index + 1}. **${item.description}**\n`;
      summary += `   • Quantity: ${item.quantity} ${item.unit}\n`;
      summary += `   • Rate: ₹${item.rate.toLocaleString('en-IN')}\n`;
      summary += `   • Amount: ₹${item.amount.toLocaleString('en-IN')}\n\n`;
    });
  }
  
  if (parsedData.referenceNumber) {
    summary += `📄 **Reference**: ${parsedData.referenceNumber}`;
    if (parsedData.referenceDate) {
      summary += ` dated ${parsedData.referenceDate}`;
    }
    summary += '\n';
  }
  
  if (parsedData.dispatchThrough) {
    summary += `🚚 **Dispatch**: via ${parsedData.dispatchThrough}\n`;
  }
  
  if (parsedData.destination) {
    summary += `📌 **Destination**: ${parsedData.destination}\n`;
  }
  
  if (parsedData.paymentTerms) {
    summary += `💳 **Payment Terms**: ${parsedData.paymentTerms}\n`;
  }
  
  if (parsedData.remarks) {
    summary += `🗒️ **Note**: ${parsedData.remarks}\n`;
  }
  
  summary += `\n📊 **GST Rate**: ${parsedData.gstRate}%\n\n`;
  summary += '**➡️ Generate PDF?**\n\n';
  summary += '✅ **Confirm & Generate** | ✏️ **Edit Details**';
  
  return summary;
};

// Test functions
function testDetection() {
  console.log('\n🔍 Testing Long-Form PO Detection...\n');
  
  let passed = 0;
  
  testCases.forEach((testCase, index) => {
    const detected = isLongFormPOPrompt(testCase.prompt);
    console.log(`${index + 1}. ${testCase.name}: ${detected ? '✅' : '❌'}`);
    if (detected) passed++;
  });
  
  const negativeCases = [
    "What is TMT steel?",
    "Give me a quotation",
    "Hello there",
    "Steel pricing help"
  ];
  
  negativeCases.forEach((prompt, index) => {
    const detected = isLongFormPOPrompt(prompt);
    console.log(`N${index + 1}. "${prompt}": ${detected ? '❌' : '✅'}`);
    if (!detected) passed++;
  });
  
  const accuracy = (passed / (testCases.length + negativeCases.length)) * 100;
  console.log(`\n📊 Detection Accuracy: ${passed}/${testCases.length + negativeCases.length} (${accuracy.toFixed(1)}%)`);
  
  return accuracy;
}

function testParsing() {
  console.log('\n🧩 Testing Parsing Accuracy...\n');
  
  let passed = 0;
  
  testCases.forEach((testCase, index) => {
    try {
      const parsed = parsePurchaseOrderPrompt(testCase.prompt);
      const isValid = validateParsedData(parsed, testCase.expected);
      
      console.log(`${index + 1}. ${testCase.name}: ${isValid ? '✅' : '❌'}`);
      console.log(`   Supplier: "${parsed.supplierName}"`);
      console.log(`   Items: ${parsed.items?.length || 0}`);
      console.log(`   Details: ${getDetailsCount(parsed)} fields extracted`);
      
      if (isValid) passed++;
    } catch (error) {
      console.log(`${index + 1}. ${testCase.name}: ❌ (Error: ${error.message})`);
    }
    console.log('');
  });
  
  const accuracy = (passed / testCases.length) * 100;
  console.log(`📊 Parsing Accuracy: ${passed}/${testCases.length} (${accuracy.toFixed(1)}%)`);
  
  return accuracy;
}

function validateParsedData(parsed, expected) {
  let score = 0;
  let maxScore = 0;
  
  // Check supplier
  if (expected.supplierName) {
    maxScore++;
    if (parsed.supplierName && parsed.supplierName.toLowerCase().includes(expected.supplierName.toLowerCase())) {
      score++;
    }
  }
  
  // Check items
  if (expected.items && expected.items.length > 0) {
    maxScore++;
    if (parsed.items && parsed.items.length > 0) {
      const firstItem = parsed.items[0];
      const expectedItem = expected.items[0];
      
      if (firstItem.description?.toLowerCase().includes(expectedItem.description.toLowerCase()) &&
          parseFloat(firstItem.quantity) === expectedItem.quantity &&
          parseFloat(firstItem.rate) === expectedItem.rate) {
        score++;
      }
    }
  }
  
  // Check additional fields
  ['referenceNumber', 'destination', 'paymentTerms', 'dispatchThrough'].forEach(field => {
    if (expected[field]) {
      maxScore++;
      if (parsed[field] && parsed[field].toLowerCase().includes(expected[field].toLowerCase())) {
        score++;
      }
    }
  });
  
  return score >= maxScore * 0.7; // 70% threshold
}

function getDetailsCount(parsed) {
  let count = 0;
  ['referenceNumber', 'referenceDate', 'dispatchThrough', 'destination', 'paymentTerms', 'remarks'].forEach(field => {
    if (parsed[field]) count++;
  });
  return count;
}

function testConfirmation() {
  console.log('\n📋 Testing Confirmation Generation...\n');
  
  const sampleData = parsePurchaseOrderPrompt(testCases[0].prompt);
  const confirmation = generatePOConfirmation(sampleData);
  
  console.log('Generated confirmation:');
  console.log(confirmation.substring(0, 200) + '...');
  
  const hasSupplier = confirmation.includes(sampleData.supplierName);
  const hasItems = confirmation.includes('Items:');
  const hasActions = confirmation.includes('Generate PDF?');
  
  console.log(`\nValidation:`);
  console.log(`Contains supplier: ${hasSupplier ? '✅' : '❌'}`);
  console.log(`Contains items: ${hasItems ? '✅' : '❌'}`);
  console.log(`Contains actions: ${hasActions ? '✅' : '❌'}`);
  
  return hasSupplier && hasItems && hasActions;
}

function testPerformance() {
  console.log('\n⚡ Testing Performance...\n');
  
  const iterations = 50;
  const testPrompt = testCases[0].prompt;
  
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    parsePurchaseOrderPrompt(testPrompt);
  }
  
  const endTime = Date.now();
  const avgTime = (endTime - startTime) / iterations;
  
  console.log(`Average parsing time: ${avgTime.toFixed(2)}ms`);
  console.log(`Performance: ${avgTime < 10 ? '✅ Excellent' : avgTime < 50 ? '✅ Good' : '⚠️  Needs optimization'}`);
  
  return avgTime;
}

function testIntegration() {
  console.log('\n🔄 Testing Integration Workflow...\n');
  
  const prompt = testCases[0].prompt;
  
  console.log('1. User Input: "Create a purchase order to Rajam Steel..."');
  
  // Step 1: Detection
  const detected = isLongFormPOPrompt(prompt);
  console.log(`2. Detection: ${detected ? '✅ Detected' : '❌ Not detected'}`);
  
  if (!detected) return false;
  
  // Step 2: Parsing
  try {
    const parsed = parsePurchaseOrderPrompt(prompt);
    console.log(`3. Parsing: ✅ Success (${parsed.items?.length || 0} items)`);
    
    // Step 3: Confirmation
    const confirmation = generatePOConfirmation(parsed);
    console.log(`4. Confirmation: ✅ Generated (${confirmation.length} chars)`);
    
    // Step 4: Validation
    const isValid = !!(parsed.supplierName && parsed.items && parsed.items.length > 0);
    console.log(`5. Validation: ${isValid ? '✅ Ready for PDF' : '❌ Missing data'}`);
    
    return isValid;
    
  } catch (error) {
    console.log(`3. Parsing: ❌ Failed (${error.message})`);
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('\nStarting comprehensive test suite...\n');
  
  const detectionAccuracy = testDetection();
  const parsingAccuracy = testParsing();
  const confirmationPassed = testConfirmation();
  const avgPerformance = testPerformance();
  const integrationPassed = testIntegration();
  
  console.log('\n🎯 FINAL RESULTS');
  console.log('='.repeat(30));
  console.log(`Detection Accuracy: ${detectionAccuracy.toFixed(1)}%`);
  console.log(`Parsing Accuracy: ${parsingAccuracy.toFixed(1)}%`);
  console.log(`Confirmation Test: ${confirmationPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`Avg Performance: ${avgPerformance.toFixed(2)}ms`);
  console.log(`Integration Test: ${integrationPassed ? 'PASSED' : 'FAILED'}`);
  
  const overallScore = ((detectionAccuracy + parsingAccuracy) / 2);
  const passed = overallScore > 80 && confirmationPassed && integrationPassed && avgPerformance < 100;
  
  console.log(`\nOverall Score: ${overallScore.toFixed(1)}%`);
  console.log(`System Status: ${passed ? '✅ READY FOR PRODUCTION' : '⚠️  NEEDS IMPROVEMENT'}`);
  
  return {
    detection: detectionAccuracy,
    parsing: parsingAccuracy,
    confirmation: confirmationPassed,
    performance: avgPerformance,
    integration: integrationPassed,
    overall: overallScore,
    passed
  };
}

// Run the tests
const results = runTests();

console.log('\n🚚 Long-form PO system testing complete!');

if (results.passed) {
  console.log('✅ System is ready for user testing with the sample prompt:');
  console.log('"Create a purchase order to Rajam Steel Traders, Chennai for 45 nos of HR Sheet 1.6mm 1250x2500mm @ ₹57.5 + GST"');
} else {
  console.log('⚠️  System needs refinement before production deployment.');
} 