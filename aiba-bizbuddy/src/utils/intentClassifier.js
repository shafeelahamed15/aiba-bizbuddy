/**
 * Intent Classification System
 * Classifies user inputs into 3 core intents: quotation_intent, edit_intent, casual_intent
 */

// Keywords and patterns for each intent
const INTENT_PATTERNS = {
  quotation_intent: {
    keywords: [
      'quote', 'quotation', 'estimate', 'price', 'rate', 'cost', 'billing',
      'create quote', 'quote for', 'need price', 'price for', 'estimate for',
      'mt', 'tonnes', 'tons', 'kg', 'nos', 'pcs', 'pieces', 'quantity',
      'ismb', 'ismc', 'isa', 'tmt', 'hr sheet', 'cr sheet', 'ms pipe',
      'steel', 'iron', 'metal', 'rebar', 'bars', 'plates', 'sheets',
    ],
    patterns: [
      /\d+\s?(mt|tonnes?|tons?|kgs?|kg|nos|pcs|pieces)/i,
      /@\s?[\d.]+/,
      /\₹\s?[\d.,]+/,
      /price\s+(for|of)/i,
      /quote\s+(for|to)/i,
      /need\s+(quote|price|estimate)/i,
      /create\s+(quote|quotation)/i,
      /generate\s+(quote|quotation)/i,
      /to\s+[a-zA-Z\s]+,/i, // "to Company Name,"
    ]
  },
  
  edit_intent: {
    keywords: [
      'change', 'update', 'edit', 'modify', 'replace', 'add', 'remove', 'delete',
      'set', 'fix', 'correct', 'adjust', 'alter', 'revise',
      'name to', 'customer to', 'address to', 'gstin to', 'gst to',
      'add item', 'remove item', 'change name', 'update price',
    ],
    patterns: [
      /change\s+\w+\s+to/i,
      /update\s+\w+\s+to/i,
      /set\s+\w+\s+to/i,
      /add\s+(item|product)/i,
      /remove\s+(item|product|last)/i,
      /replace\s+\w+\s+with/i,
      /modify\s+\w+/i,
      /edit\s+\w+/i,
    ]
  },
  
  casual_intent: {
    keywords: [
      'hi', 'hello', 'hey', 'hiya', 'howdy', 'greetings',
      'thanks', 'thank you', 'thankyou', 'thx', 'ty',
      'ok', 'okay', 'alright', 'sure', 'fine', 'good', 'great', 'cool',
      'yes', 'no', 'yeah', 'yep', 'nope', 'yup',
      'what can you do', 'help', 'how are you', 'how do you work',
      'what is this', 'who are you', 'what are you',
      'bye', 'goodbye', 'see you', 'later', 'quit', 'exit',
    ],
    patterns: [
      /^(hi|hello|hey)$/i,
      /^(ok|okay|alright|sure|fine)$/i,
      /^(yes|no|yeah|yep|nope)$/i,
      /^(thanks?|thank you|thx)$/i,
      /what\s+(can|do)\s+you/i,
      /how\s+are\s+you/i,
      /who\s+are\s+you/i,
      /what\s+(is|are)\s+(this|you)/i,
    ]
  }
};

/**
 * OpenAI API call for complex intent classification
 * Used as fallback when keyword/regex detection is insufficient
 */
async function classifyWithGPT(message) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `You are an intent classifier for a steel trading chatbot. Classify the user message into exactly one of these intents:

1. "quotation_intent" - user wants to create/generate quotes, get prices, estimates for steel products
2. "edit_intent" - user wants to change/update/modify existing data (names, prices, items, etc.)  
3. "casual_intent" - greetings, thanks, general questions about the bot, yes/no responses

Respond with ONLY the intent name (e.g., "quotation_intent").`
        }, {
          role: 'user', 
          content: message
        }],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const intent = data.choices[0].message.content.trim().toLowerCase();
    
    // Validate the returned intent
    if (['quotation_intent', 'edit_intent', 'casual_intent'].includes(intent)) {
      return intent;
    }
    
    return 'casual_intent'; // Default fallback
    
  } catch (error) {
    console.error('GPT classification error:', error);
    return 'casual_intent'; // Safe fallback
  }
}

/**
 * Main intent classification function
 * Uses keyword matching, regex patterns, and GPT fallback
 */
export async function classifyIntent(message) {
  if (!message || typeof message !== 'string') {
    return 'casual_intent';
  }

  const text = message.toLowerCase().trim();
  const confidence = { quotation: 0, edit: 0, casual: 0 };

  // Step 1: Keyword matching with scoring
  Object.entries(INTENT_PATTERNS).forEach(([intent, patterns]) => {
    const intentKey = intent.split('_')[0]; // quotation_intent -> quotation
    
    // Check keywords
    patterns.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        confidence[intentKey] += 1;
      }
    });

    // Check regex patterns (weighted higher)
    patterns.patterns.forEach(pattern => {
      if (pattern.test(text)) {
        confidence[intentKey] += 2;
      }
    });
  });

  // Step 2: Determine highest scoring intent
  const maxScore = Math.max(...Object.values(confidence));
  const topIntent = Object.keys(confidence).find(key => confidence[key] === maxScore);

  // Step 3: High confidence threshold check
  if (maxScore >= 3) {
    return `${topIntent}_intent`;
  }

  // Step 4: Medium confidence - additional validation
  if (maxScore >= 1) {
    // Special validation for edit commands
    if (topIntent === 'edit') {
      const editIndicators = ['change', 'update', 'add', 'remove', 'set', 'modify'];
      if (editIndicators.some(indicator => text.includes(indicator))) {
        return 'edit_intent';
      }
    }

    // Special validation for quotation requests
    if (topIntent === 'quotation') {
      const quotationIndicators = ['quote', 'price', 'estimate', 'cost', '@', '₹'];
      if (quotationIndicators.some(indicator => text.includes(indicator))) {
        return 'quotation_intent';
      }
    }

    return `${topIntent}_intent`;
  }

  // Step 5: Low confidence - use GPT for complex cases
  if (text.length > 10 && !isSimpleCasualResponse(text)) {
    console.log('Using GPT classification for:', text);
    return await classifyWithGPT(message);
  }

  // Step 6: Default to casual for simple responses
  return 'casual_intent';
}

/**
 * Helper function to detect simple casual responses
 */
function isSimpleCasualResponse(text) {
  const simpleCasual = ['hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'thanks', 'thank you'];
  return simpleCasual.includes(text.toLowerCase().trim());
}

/**
 * Get confidence scores for debugging
 */
export function getIntentConfidence(message) {
  const text = message.toLowerCase().trim();
  const confidence = { quotation_intent: 0, edit_intent: 0, casual_intent: 0 };

  Object.entries(INTENT_PATTERNS).forEach(([intent, patterns]) => {
    patterns.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        confidence[intent] += 1;
      }
    });

    patterns.patterns.forEach(pattern => {
      if (pattern.test(text)) {
        confidence[intent] += 2;
      }
    });
  });

  return confidence;
} 