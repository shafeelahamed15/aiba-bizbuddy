/**
 * Test the new intent classification system
 * Run this with: node test_intent_system.js
 */

import { classifyIntent } from './src/utils/intentClassifier.js';
import { routeIntent } from './src/utils/intentRouter.js';

const testMessages = [
  // Quotation intents
  "create quote for Swastik Industries",
  "quote for 10MT TMT bars to ABC Company",
  "need price for 5MT steel",
  "To ABC Constructions, ISMB 150 - 45 Nos @ 75+GST",
  
  // Edit intents  
  "change name to XYZ Corp",
  "add item TMT 10mm 5MT @ ₹55",
  "update GST to 12%",
  "remove last item",
  
  // Casual intents
  "hi",
  "thanks",
  "what can you do?",
  "ok"
];

async function testIntentSystem() {
  console.log('🎯 Testing Intent Classification System\n');
  console.log('=' .repeat(60));
  
  for (const message of testMessages) {
    console.log(`\n📝 Message: "${message}"`);
    
    try {
      // Test classification
      const intent = await classifyIntent(message);
      console.log(`🏷️  Intent: ${intent}`);
      
      // Test routing
      const result = await routeIntent(message, { quotationActive: false });
      console.log(`📋 Handler: ${result.routingMetadata?.handledBy}`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📝 Response: ${result.response?.substring(0, 100)}${result.response?.length > 100 ? '...' : ''}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('-'.repeat(40));
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test
testIntentSystem().catch(console.error); 