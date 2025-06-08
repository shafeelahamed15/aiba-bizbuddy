# 🎯 Intent Classification System for AIBA Chatbot

## Overview

The AIBA chatbot now uses a sophisticated intent classification system that automatically categorizes user inputs into **3 core intents** and routes them to specialized modular handlers. This system provides better accuracy, maintainability, and extensibility for future features.

## 🎯 Core Intents

### 1. **quotation_intent**
Handles all quotation-related requests:
- Creating new quotations
- Price estimates and steel calculations  
- Direct quotation parsing
- Steel construction estimates

**Examples:**
- `"create quote for Swastik Industries"`
- `"quote for 10MT TMT bars to ABC Company"`
- `"need price for 5MT steel"`
- `"To ABC Constructions, ISMB 150 - 45 Nos @ 75+GST"`

### 2. **edit_intent**
Handles modifications to existing data:
- Changing customer details
- Adding/removing products
- Updating prices and terms
- Quotation management commands

**Examples:**
- `"change name to XYZ Corp"`
- `"add item TMT 10mm 5MT @ ₹55"`
- `"update GST to 12%"`
- `"remove last item"`

### 3. **casual_intent**
Handles conversational interactions:
- Greetings and farewells
- Thank you messages
- General questions about the bot
- Yes/no responses and confirmations

**Examples:**
- `"hi"`, `"hello"`, `"thanks"`
- `"what can you do?"`
- `"ok"`, `"yes"`, `"no"`

## 🏗️ System Architecture

```
User Message
     ↓
🎯 intentClassifier.js
     ↓
🚦 intentRouter.js
     ↓
📁 /intents/
   ├── handleQuotation.js
   ├── handleEdit.js  
   └── handleCasualChat.js
```

## 📁 File Structure

```
src/
├── utils/
│   ├── intentClassifier.js     # Core classification logic
│   └── intentRouter.js         # Routes intents to handlers
│
└── intents/
    ├── handleQuotation.js      # Quotation intent handler
    ├── handleEdit.js           # Edit intent handler  
    └── handleCasualChat.js     # Casual chat handler
```

## 🧠 Classification Logic

The system uses a **3-tier classification approach**:

### 1. **Keyword Matching** (Fast, Local)
- Pre-defined keywords for each intent
- Weighted scoring system
- High confidence threshold (≥3 points)

### 2. **Regex Patterns** (Medium, Local)  
- Complex pattern matching
- Handles structured commands
- Medium confidence threshold (≥1 point)

### 3. **GPT Fallback** (Accurate, API)
- Uses OpenAI GPT-3.5-turbo for complex cases
- Only when keyword/regex confidence is low
- Ensures high accuracy for edge cases

## 🎛️ Key Features

### ✅ **Modular Architecture**
- Each intent has its own handler file
- Easy to add new intents (e.g., `invoice_intent`, `faq_intent`)
- Separated concerns for better maintainability

### ✅ **Smart Fallbacks**
- Keyword matching → Regex patterns → GPT API
- Graceful degradation if APIs fail
- Context-aware responses

### ✅ **Context Awareness**
- Maintains conversation state
- Context-dependent responses (e.g., "yes" during quotation flow)
- Session tracking and history

### ✅ **Extensible Design**
- Simple to add new intent types
- Plug-and-play handler system
- Comprehensive logging and debugging

## 🚀 Usage in ChatBot

The new system integrates seamlessly with the existing ChatBot:

```javascript
// In ChatBot.jsx
import { routeIntent, validateAndEnrichContext } from '../utils/intentRouter';

// Prepare context
const intentContext = validateAndEnrichContext({
  quotationActive: quotationFlow.active,
  quotationData: quotationFlow.data,
  awaitingConfirmation: quotationFlow.pendingGeneration,
  hasRecentQuotations: messages.some(m => m.showPDFButtons),
  hasCustomers: true
});

// Route through new intent system
const intentResult = await routeIntent(prompt, intentContext);

// Handle based on result
if (!intentResult.requiresProcessing) {
  // Direct response
  setMessages(prev => [...prev, { 
    type: 'bot', 
    text: intentResult.response,
    showPDFButtons: intentResult.showPDFButtons || false
  }]);
} else {
  // Process based on type
  switch (intentResult.processingType) {
    case "quotation_create":
      await startSmartCustomerSelection();
      break;
    case "apply_edit":
      // Apply edit using existing system
      break;
    // ... other cases
  }
}
```

## 🎯 Intent Handler Details

### QuotationHandler (`handleQuotation.js`)
- **Steel Estimation**: Complex construction calculations
- **Direct Parsing**: Immediate quotation from detailed input
- **Guided Flow**: Step-by-step quotation creation
- **Smart Routing**: Determines best approach based on input complexity

### EditHandler (`handleEdit.js`)
- **Customer Edits**: Name, address, GSTIN changes
- **Product Edits**: Add, remove, update items and prices
- **Terms Edits**: GST, transport, loading charges
- **Meta Commands**: Show draft, reset, finalize

### CasualChatHandler (`handleCasualChat.js`)
- **Context-Aware**: Different responses based on current state
- **Natural Responses**: Varied, human-like replies
- **Feature Discovery**: Helps users understand capabilities
- **Smart Suggestions**: Contextual next actions

## 🔧 Configuration

### Adding New Intents

1. **Add to `intentClassifier.js`:**
```javascript
const INTENT_PATTERNS = {
  // ... existing intents
  new_intent: {
    keywords: ['keyword1', 'keyword2'],
    patterns: [/pattern1/i, /pattern2/i]
  }
};
```

2. **Create handler in `/intents/`:**
```javascript
// handleNewIntent.js
export async function handleNewIntent(message, context = {}) {
  // Handler logic
  return {
    success: true,
    response: "Response text",
    requiresProcessing: false
  };
}
```

3. **Add to `intentRouter.js`:**
```javascript
import { handleNewIntent } from '../intents/handleNewIntent.js';

// In routeIntent function:
case 'new_intent':
  result = await handleNewIntent(message, enrichedContext);
  break;
```

## 📊 Debugging & Analytics

The system provides comprehensive logging:

```javascript
// View classification confidence
import { getIntentConfidence } from './utils/intentClassifier.js';
const confidence = getIntentConfidence("your message");
console.log(confidence);
// Output: { quotation_intent: 2, edit_intent: 0, casual_intent: 1 }

// View routing metadata
const result = await routeIntent(message, context);
console.log(result.routingMetadata);
// Output: { classifiedAs: 'quotation_intent', handledBy: 'QuotationHandler', confidence: {...} }
```

## 🧪 Testing

Run the test suite to verify classification accuracy:

```bash
node test_intent_system.js
```

This tests all three intents with various message examples and shows:
- Classification results
- Handler routing
- Response generation
- Error handling

## 🚀 Future Enhancements

The modular design supports easy additions:

### 🎯 **invoice_intent**
- Generate invoices from quotations
- Invoice tracking and management
- Payment status updates

### 🎯 **faq_intent**  
- Frequently asked questions
- Product specifications
- Business process help

### 🎯 **analytics_intent**
- Business performance reports
- Sales analytics
- Market trend analysis

### 🎯 **customer_management_intent**
- Customer database operations
- Contact management
- Communication history

## 📝 Migration Notes

The new system:
- ✅ **Preserves** all existing functionality
- ✅ **Maintains** quotation flow guards and context
- ✅ **Integrates** with existing steel knowledge system
- ✅ **Supports** all current features (PDF generation, editing, etc.)
- ✅ **Improves** classification accuracy and response quality

The old `classifyUserInput()` function is gradually being replaced, but all existing flows continue to work during the transition.

---

**🎉 The new intent system makes AIBA more intelligent, maintainable, and ready for future features!** 