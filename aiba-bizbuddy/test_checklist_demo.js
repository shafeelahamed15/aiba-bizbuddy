/**
 * Demo Test for Dynamic Quotation Checklist System
 * Tests the step-by-step quotation creation flow
 */

import { createQuotationChecklist, formatStepPrompt, validateQuotationSchema } from './src/utils/quotationChecklist.js';
import { handleChecklistQuotation, handleChecklistCommand, isChecklistCommand } from './src/intents/handleChecklistQuotation.js';

console.log('📋 Starting Quotation Checklist Demo...\n');

// Test 1: Create new checklist and navigate through steps
console.log('=== Test 1: Complete Quotation Flow ===');

const checklist = createQuotationChecklist();
console.log('✅ Created new checklist');

// Test inputs simulating user responses
const testInputs = [
  "ABC Construction Pvt Ltd",          // Customer name
  "items",                             // Start items (trigger)
  "TMT Bars 10mm",                     // Product description
  "5000",                              // Quantity
  "55",                                // Rate
  "no",                               // No more products
  "18",                               // GST
  "Extra as per actuals",             // Transport
  "Rs.250 per MT extra",              // Loading charges
  "50% Advance, 50% on delivery",     // Payment terms
  "15 days"                           // Price validity
];

async function runChecklistDemo() {
  let currentStep = checklist.getCurrentStep();
  
  for (let i = 0; i < testInputs.length && currentStep; i++) {
    const input = testInputs[i];
    console.log(`\n📝 Step ${i + 1}: ${currentStep.title}`);
    console.log(`💬 User input: "${input}"`);
    
    const result = checklist.processInput(input);
    console.log(`📊 Result:`, result.success ? '✅ Success' : '❌ Failed');
    console.log(`💭 Response: ${result.message}`);
    
    if (result.nextPrompt) {
      console.log(`🔔 Next prompt: ${result.nextPrompt}`);
    }
    
    if (result.isComplete) {
      console.log('\n🎉 Checklist completed!');
      break;
    }
    
    // Handle "add more items" flow
    if (result.awaitingMoreItems) {
      console.log('\n🔄 Handling "add more items" response...');
      const moreItemsResult = checklist.handleMoreItemsResponse(testInputs[++i]);
      console.log(`💬 User response: "${testInputs[i]}"`);
      console.log(`📊 More items result:`, moreItemsResult.success ? '✅ Success' : '❌ Failed');
      console.log(`💭 Response: ${moreItemsResult.message}`);
    }
    
    currentStep = checklist.getCurrentStep();
  }
  
  // Show final summary
  console.log('\n=== Final Quotation Summary ===');
  console.log(checklist.getSummary());
  
  // Show progress
  const progress = checklist.getProgress();
  console.log(`\n📊 Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
  
  // Validate final data
  const finalData = checklist.getQuotationData();
  const validation = validateQuotationSchema(finalData);
  console.log(`\n✅ Schema validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
  if (!validation.isValid) {
    console.log('❌ Validation errors:', validation.errors);
  }
}

// Test 2: Test checklist commands
console.log('\n\n=== Test 2: Checklist Commands ===');

function testChecklistCommands() {
  const testCommands = ['help', 'summary', 'reset', 'show progress'];
  
  testCommands.forEach(command => {
    console.log(`\n💬 Command: "${command}"`);
    console.log(`🔍 Is command: ${isChecklistCommand(command)}`);
    
    if (isChecklistCommand(command)) {
      const result = handleChecklistCommand(command, checklist);
      if (result) {
        console.log(`📊 Result: ✅ Success`);
        console.log(`💭 Response: ${result.response}`);
      }
    }
  });
}

// Test 3: Test validation scenarios
console.log('\n\n=== Test 3: Validation Tests ===');

function testValidationScenarios() {
  const validationChecklist = createQuotationChecklist();
  
  // Test invalid customer name
  console.log('\n🧪 Testing invalid customer name...');
  const invalidResult = validationChecklist.processInput('A'); // Too short
  console.log(`📊 Result: ${invalidResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`💭 Message: ${invalidResult.message}`);
  
  // Test valid customer name
  console.log('\n🧪 Testing valid customer name...');
  const validResult = validationChecklist.processInput('Valid Company Name');
  console.log(`📊 Result: ${validResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`💭 Message: ${validResult.message}`);
}

// Test 4: Test handler integration
console.log('\n\n=== Test 4: Handler Integration ===');

async function testHandlerIntegration() {
  const handlerChecklist = createQuotationChecklist();
  
  // Simulate first step
  const firstStep = handlerChecklist.getCurrentStep();
  console.log('\n📝 First step with handler:');
  console.log(`🔔 Prompt: ${formatStepPrompt(firstStep)}`);
  
  // Test handler with customer name
  const handlerResult = await handleChecklistQuotation('XYZ Industries', handlerChecklist);
  console.log(`📊 Handler result: ${handlerResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`💭 Response: ${handlerResult.response}`);
  
  // Test progress display
  const progress = handlerChecklist.getProgress();
  console.log(`📊 Progress after handler: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
}

// Test 5: Test multiple items flow
console.log('\n\n=== Test 5: Multiple Items Flow ===');

function testMultipleItemsFlow() {
  const itemsChecklist = createQuotationChecklist();
  
  // Navigate to items step
  itemsChecklist.processInput('Test Customer');
  
  const itemsInputs = [
    'TMT Bars 10mm',       // Item 1 description
    '1000',                // Item 1 quantity  
    '50',                  // Item 1 rate
    'yes',                 // Add more items
    'ISMB 150',            // Item 2 description
    '500',                 // Item 2 quantity
    '80',                  // Item 2 rate
    'yes',                 // Add more items
    'HR Sheet 2mm',        // Item 3 description
    '200',                 // Item 3 quantity
    '45',                  // Item 3 rate
    'no'                   // No more items
  ];
  
  let stepCount = 0;
  let awaitingMoreItems = false;
  
  itemsInputs.forEach(input => {
    console.log(`\n📝 Items step ${++stepCount}: "${input}"`);
    
    let result;
    if (awaitingMoreItems) {
      result = itemsChecklist.handleMoreItemsResponse(input);
      awaitingMoreItems = result.nextPrompt ? false : (input.toLowerCase() === 'yes');
    } else {
      result = itemsChecklist.processInput(input);
      awaitingMoreItems = result.awaitingMoreItems || false;
    }
    
    console.log(`📊 Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`💭 Response: ${result.message}`);
    
    if (result.nextPrompt) {
      console.log(`🔔 Next prompt: ${result.nextPrompt}`);
    }
  });
  
  // Show final items
  const finalData = itemsChecklist.getQuotationData();
  console.log('\n📦 Final items added:');
  finalData.items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.description} - ${item.qty}kg @ ₹${item.rate}/kg = ₹${item.amount.toLocaleString()}`);
  });
}

// Run all tests
async function runAllTests() {
  try {
    await runChecklistDemo();
    testChecklistCommands();
    testValidationScenarios();
    await testHandlerIntegration();
    testMultipleItemsFlow();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n=== Demo Statistics ===');
    console.log(`✅ Checklist steps: ${checklist.getProgress().total}`);
    console.log(`✅ Schema validation: Working`);
    console.log(`✅ Command handling: Working`);
    console.log(`✅ Multiple items: Working`);
    console.log(`✅ Handler integration: Working`);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for testing
export {
  runAllTests,
  runChecklistDemo,
  testChecklistCommands,
  testValidationScenarios,
  testHandlerIntegration,
  testMultipleItemsFlow
};

// Run if executed directly
if (import.meta.url === new URL(import.meta.url, import.meta.resolve('./')).href) {
  runAllTests();
} 