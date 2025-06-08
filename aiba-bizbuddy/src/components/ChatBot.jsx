import { useState, useEffect } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { useAuth } from '../context/AuthContext';
import { savePromptHistory } from '../utils/promptLogger';
import { parseQuotationPrompt } from '../utils/parseQuotationInput';
import { validateQuotationData, getValidationMessage, validateMinimumQuotationData, validateCriticalFields, getCriticalValidationMessage, applyFallbackDefaults } from '../utils/validateQuotationInput';
import { parsePromptWithFallback, validateParsedData, formatParsedData } from '../utils/parsePrompt';
import { calculateWeight, getWeightInfo, isValidItem, findSimilarItems } from '../utils/calculateWeight';
import { detectGreeting, detectQuestion, detectQuotationRequest, generateSteelResponse } from '../utils/steelKnowledge';
  import { routeIntent, validateAndEnrichContext } from '../utils/intentRouter';
  import { handleChecklistQuotation, handleChecklistCommand, isChecklistCommand, exportChecklistData } from '../intents/handleChecklistQuotation';
import promptParser from '../utils/promptParser';
import chatbotStateManager from '../utils/chatbotStateManager';
import suggestionManager from '../utils/suggestionManager.jsx';
import SettingsMenu from './SettingsMenu';
import CleanBusinessInfo from './CleanBusinessInfo';

// 🧠 ADVANCED INPUT CLASSIFIER - Smarter than previous detection
function classifyUserInput(message) {
  const text = message.toLowerCase().trim();

  // Casual conversation triggers
  const casualTriggers = ["hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "sure", "fine", "great", "cool", "yo", "sup", "howdy"];
  
  // Question triggers
  const questionTriggers = ["what", "how", "when", "can", "do", "is", "are", "why", "which", "where", "who"];
  
  // Quotation triggers (more comprehensive)
  const quotationTriggers = [
    "quote", "quotation", "estimate", "price", "rate", "cost",
    "mt", "tonnes", "tons", "kg", "nos", "pcs", "pieces",
    "ismb", "ismc", "isa", "tmt", "hr sheet", "cr sheet", "ms pipe",
    "@", "+gst", "delivery", "transport"
  ];

  // Check for specific quotation creation commands
  const quotationCommands = [
    "create quote", "create quotation", "generate quotation", "new quotation"
  ];

  // Priority-based classification
  
  // 1. Check for quotation creation commands first (highest priority)
  if (quotationCommands.some(command => text.includes(command))) {
    return "quotation_create";
  }
  
  // 2. Check for quotation requests (second priority)
  if (
    quotationTriggers.some(trigger => text.includes(trigger)) ||
    text.match(/\d+\s?(nos|pcs|mt|tons?|kgs?|kg)/i) ||
    text.match(/@\s?[\d.]+/) ||
    text.includes("create quotation") ||
    text.match(/to\s+[^,\n]+,/i)
  ) {
    return "quotation";
  }
  
  // 2. Check for casual responses
  if (casualTriggers.some(phrase => text === phrase || text.includes(phrase))) {
    return "casual";
  }
  
  // 3. Check for questions
  if (
    questionTriggers.some(word => text.startsWith(word)) || 
    text.endsWith("?") ||
    text.includes("difference") ||
    text.includes("tell me") ||
    text.includes("explain")
  ) {
    return "question";
  }

  return "unknown";
}

// 🎯 MAIN CHAT RESPONSE HANDLER - Controls conversation flow
function handleChatResponse(userMessage, currentContext = {}) {
  const messageType = classifyUserInput(userMessage);
  
  console.log(`🎯 Classified "${userMessage}" as: ${messageType}`);

  switch (messageType) {
    case "casual":
      return {
        type: "casual",
        reply: getRandomCasualResponse(),
        showPDFButtons: false,
        requiresProcessing: false
      };

    case "question":
      return {
        type: "question", 
        reply: null, // Will be handled by steel knowledge system
        showPDFButtons: false,
        requiresProcessing: true,
        processingType: "knowledge"
      };

    case "quotation_create":
      return {
        type: "quotation_create",
        reply: null, // Will be handled by smart customer selection
        showPDFButtons: false,
        requiresProcessing: true,
        processingType: "quotation_create"
      };

    case "quotation":
      return {
        type: "quotation",
        reply: null, // Will be handled by quotation system
        showPDFButtons: false, // Will be set after successful parsing
        requiresProcessing: true,
        processingType: "quotation"
      };

    default:
      return {
        type: "unknown",
        reply: "I'm ready to help! You can:\n• Create quotations for steel products\n• Ask questions about steel types and specifications\n• Get market insights and business advice\n\nWhat would you like to do?",
        showPDFButtons: false,
        requiresProcessing: false
      };
  }
}

// 💬 Natural casual responses
function getRandomCasualResponse() {
  const responses = [
    "Hey there! 😊 Ready to help with your steel business needs.",
    "Hello! How can I assist you with quotations or steel questions today?",
    "Hi! I'm here to help with steel trading, quotations, and product info.",
    "Great to hear from you! Need a quotation or have steel-related questions?",
    "Hello! Let me know if you'd like to create quotations or learn about steel products.",
    "Hey! Ready to help with steel quotations, rates, or product specifications."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// 🛠️ EDIT MODE FUNCTIONALITY

// Edit command parser - extracts intent and parameters from natural language
function parseEditCommand(command) {
  const text = command.toLowerCase().trim();
  
  console.log('🛠️ Parsing edit command:', text);
  
  // Customer details updates - more flexible patterns
  if (text.includes('change') && text.includes('customer')) {
    console.log('🔍 Detected change customer pattern');
    const nameMatch = text.match(/change\s+customer\s+(?:name\s+)?(?:to\s+)?(.+)$/i) || 
                     text.match(/customer\s+(?:name\s+)?(?:to\s+)?(.+)$/i);
    if (nameMatch) {
      console.log('✅ Customer name match found:', nameMatch[1]);
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    }
  }
  
  // More flexible customer name patterns
  if ((text.includes('update') || text.includes('set')) && text.includes('customer')) {
    console.log('🔍 Detected update/set customer pattern');
    const nameMatch = text.match(/(?:update|set)\s+customer\s+(?:name\s+)?(?:to\s+)?(.+)$/i);
    if (nameMatch) {
      console.log('✅ Customer name match found:', nameMatch[1]);
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    }
  }
  
  // Handle "change name to [value]" without requiring "customer" keyword
  if (text.includes('change') && text.includes('name') && text.includes('to')) {
    console.log('🔍 Detected change name pattern');
    const nameMatch = text.match(/change\s+(?:customer\s+)?name\s+to\s+(.+)$/i);
    if (nameMatch) {
      console.log('✅ Customer name match found:', nameMatch[1]);
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    } else {
      // Fallback when pattern detected but no name extracted
      console.log('⚠️ Change name pattern detected but no name extracted');
      return {
        type: 'customer',
        action: 'request_name',
        value: null
      };
    }
  }
  
  // Handle "update name to [value]" and "set name to [value]"
  if ((text.includes('update') || text.includes('set')) && text.includes('name') && text.includes('to')) {
    console.log('🔍 Detected update/set name pattern');
    const nameMatch = text.match(/(?:update|set)\s+(?:customer\s+)?name\s+to\s+(.+)$/i);
    if (nameMatch) {
      console.log('✅ Customer name match found:', nameMatch[1]);
      return {
        type: 'customer',
        action: 'update_name',
        value: nameMatch[1].trim()
      };
    } else {
      // Fallback when pattern detected but no name extracted
      console.log('⚠️ Update/set name pattern detected but no name extracted');
      return {
        type: 'customer',
        action: 'request_name',
        value: null
      };
    }
  }
  
  if (text.includes('address')) {
    const addressMatch = text.match(/(?:change|update|set)\s+address\s+(?:to\s+)?(.+)$/i);
    if (addressMatch) {
      return {
        type: 'customer', 
        action: 'update_address',
        value: addressMatch[1].trim()
      };
    }
  }
  
  if (text.includes('gstin')) {
    const gstinMatch = text.match(/(?:change|update|set)\s+gstin\s+(?:to\s+)?([^\s,\n]+)/i);
    if (gstinMatch) {
      return {
        type: 'customer',
        action: 'update_gstin', 
        value: gstinMatch[1].trim()
      };
    }
  }
  
  // Product modifications - much more flexible patterns
  if (text.includes('add') && (text.includes('item') || text.includes('product') || text.includes('tmt') || text.includes('ismb') || text.includes('steel'))) {
    console.log('🔍 Detected add item command');
    
    // Pattern 1: "Add item: ISMB 150 - 5MT @ 58+GST"
    let itemMatch = text.match(/add.*?(?:item|product)?:?\s*([^@]+)\s*@\s*([\d.]+)/i);
    
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const rate = parseFloat(itemMatch[2]);
      
      // Extract quantity from description
      const qtyMatch = description.match(/([\d.]+)\s*(?:MT|kg|nos)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) * (description.toLowerCase().includes('mt') ? 1000 : 1) : 1000;
      
      return {
        type: 'product',
        action: 'add',
        value: {
          description: description.replace(/\s*-\s*[\d.]+\s*(?:MT|kg|nos)/i, '').trim(),
          qty,
          rate,
          amount: qty * rate
        }
      };
    }
    
    // Pattern 2: "add item TMT 2x10" (no rate specified)
    itemMatch = text.match(/add.*?(?:item\s+)?(.+)$/i);
    if (itemMatch) {
      const description = itemMatch[1].trim();
      
      // Try to extract dimensions or quantity
      const qtyMatch = description.match(/([\d.]+)\s*(?:MT|kg|nos|mm|x)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) * 1000 : 5000; // Default 5MT if no quantity
      
      return {
        type: 'product',
        action: 'add',
        value: {
          description: description,
          qty,
          rate: 55, // Default rate
          amount: qty * 55
        }
      };
    }
  }
  
  if (text.includes('remove') && (text.includes('last') || text.includes('product') || text.includes('item'))) {
    return {
      type: 'product',
      action: 'remove_last'
    };
  }
  
  if (text.includes('update') && text.includes('price')) {
    const priceMatch = text.match(/update\s+price\s+of\s+([^t]+)\s+to\s+[₹]?([\d.]+)/i);
    if (priceMatch) {
      return {
        type: 'product',
        action: 'update_price',
        description: priceMatch[1].trim(),
        value: parseFloat(priceMatch[2])
      };
    }
  }
  
  if (text.includes('replace') && text.includes('item')) {
    const replaceMatch = text.match(/replace\s+(first|last|\d+).*?with\s+([^@]+)\s*@\s*([\d.]+)/i);
    if (replaceMatch) {
      const position = replaceMatch[1];
      const description = replaceMatch[2].trim();
      const rate = parseFloat(replaceMatch[3]);
      
      const qtyMatch = description.match(/([\d.]+)\s*(?:MT|kg|nos)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) * (description.toLowerCase().includes('mt') ? 1000 : 1) : 1000;
      
      return {
        type: 'product',
        action: 'replace',
        position: position === 'first' ? 0 : position === 'last' ? -1 : parseInt(position) - 1,
        value: {
          description: description.replace(/\s*-\s*[\d.]+\s*(?:MT|kg|nos)/i, '').trim(),
          qty,
          rate,
          amount: qty * rate
        }
      };
    }
  }
  
  // Terms and charges - more flexible GST parsing
  if ((text.includes('update') || text.includes('change') || text.includes('set')) && text.includes('gst')) {
    const gstMatch = text.match(/(?:update|set|change)\s+gst\s+(?:to\s+)?([\d.]+)%?/i);
    if (gstMatch) {
      return {
        type: 'terms',
        action: 'update_gst',
        value: parseFloat(gstMatch[1])
      };
    }
  }
  
  if (text.includes('loading charges') || text.includes('loading charge')) {
    const loadingMatch = text.match(/(?:add|set|change|update)\s+loading\s+charges?\s+(?:to\s+)?(.+)$/i);
    if (loadingMatch) {
      return {
        type: 'terms',
        action: 'update_loading',
        value: loadingMatch[1].trim()
      };
    }
  }
  
  if (text.includes('transport')) {
    const transportMatch = text.match(/(?:change|set|update)\s+transport\s+(?:to\s+)?(.+)$/i);
    if (transportMatch) {
      return {
        type: 'terms',
        action: 'update_transport',
        value: transportMatch[1].trim()
      };
    }
  }
  
  if (text.includes('payment')) {
    const paymentMatch = text.match(/(?:set|change|update)\s+payment\s+(?:terms?\s+)?(?:to\s+)?(.+)$/i);
    if (paymentMatch) {
      return {
        type: 'terms',
        action: 'update_payment',
        value: paymentMatch[1].trim()
      };
    }
  }
  
  // Meta commands - more flexible patterns
  if ((text.includes('show') || text.includes('display')) && (text.includes('draft') || text.includes('quotation') || text.includes('current'))) {
    return {
      type: 'meta',
      action: 'show_draft'
    };
  }
  
  if (text.includes('reset')) {
    return {
      type: 'meta',
      action: 'reset'
    };
  }
  
  if ((text.includes('done') || text.includes('finished') || text.includes('complete') || text.includes('finish')) && 
      !text.includes('not done')) {
    return {
      type: 'meta',
      action: 'finalize'
    };
  }
  
  // Just "done" by itself
  if (text === 'done' || text === 'finish' || text === 'complete') {
    return {
      type: 'meta',
      action: 'finalize'
    };
  }
  
  console.log('❌ No edit command pattern matched');
  return {
    type: 'unknown',
    action: 'unknown'
  };
}

// Apply edit command to quotation data
function applyEditToQuotation(quotationData, editCommand) {
  const updatedData = { ...quotationData };
  let confirmationMessage = '';
  
  switch (editCommand.type) {
    case 'customer':
      switch (editCommand.action) {
        case 'update_name':
          updatedData.customerName = editCommand.value;
          confirmationMessage = `✅ Customer name updated to: **${editCommand.value}**`;
          break;
        case 'update_address':
          updatedData.customerAddress = editCommand.value;
          confirmationMessage = `✅ Updated customer address to: **${editCommand.value}**`;
          break;
        case 'update_gstin':
          updatedData.customerGstin = editCommand.value;
          confirmationMessage = `✅ Updated customer GSTIN to: **${editCommand.value}**`;
          break;
      }
      break;
      
    case 'product':
      switch (editCommand.action) {
        case 'add':
          updatedData.products = [...updatedData.products, editCommand.value];
          confirmationMessage = `✅ Added new product: **${editCommand.value.description}** - ${editCommand.value.qty}kg @ ₹${editCommand.value.rate}`;
          break;
          
        case 'remove_last':
          if (updatedData.products.length > 0) {
            const removedProduct = updatedData.products.pop();
            confirmationMessage = `✅ Removed product: **${removedProduct.description}**`;
          } else {
            confirmationMessage = `❌ No products to remove`;
          }
          break;
          
        case 'update_price':
          const productIndex = updatedData.products.findIndex(p => 
            p.description.toLowerCase().includes(editCommand.description.toLowerCase())
          );
          if (productIndex !== -1) {
            updatedData.products[productIndex].rate = editCommand.value;
            updatedData.products[productIndex].amount = updatedData.products[productIndex].qty * editCommand.value;
            confirmationMessage = `✅ Updated **${updatedData.products[productIndex].description}** price to ₹${editCommand.value}`;
          } else {
            confirmationMessage = `❌ Product "${editCommand.description}" not found`;
          }
          break;
          
        case 'replace':
          const replaceIndex = editCommand.position === -1 ? updatedData.products.length - 1 : editCommand.position;
          if (replaceIndex >= 0 && replaceIndex < updatedData.products.length) {
            const oldProduct = updatedData.products[replaceIndex];
            updatedData.products[replaceIndex] = editCommand.value;
            confirmationMessage = `✅ Replaced **${oldProduct.description}** with **${editCommand.value.description}**`;
          } else {
            confirmationMessage = `❌ Invalid product position`;
          }
          break;
      }
      break;
      
    case 'terms':
      switch (editCommand.action) {
        case 'update_loading':
          updatedData.loadingCharges = editCommand.value;
          confirmationMessage = `✅ Updated loading charges to: **${editCommand.value}**`;
          break;
        case 'update_transport':
          updatedData.transport = editCommand.value;
          confirmationMessage = `✅ Updated transport to: **${editCommand.value}**`;
          break;
        case 'update_payment':
          updatedData.paymentTerms = editCommand.value;
          confirmationMessage = `✅ Updated payment terms to: **${editCommand.value}**`;
          break;
        case 'update_gst':
          updatedData.gst = editCommand.value;
          confirmationMessage = `✅ Updated GST to: **${editCommand.value}%**`;
          break;
      }
      break;
      
    case 'meta':
      // Meta commands don't modify data, just return current state
      confirmationMessage = editCommand.action;
      break;
      
    default:
      confirmationMessage = `❌ I didn't understand that edit command. Here are some examples:

**Customer Updates:**
• "Change customer name to ABC Corp"
• "Update address to 123 Main St, Chennai"

**Add Products:**
• "Add item: TMT 12mm - 5MT @ 58+GST"
• "Add item ISMB 150 - 3MT @ 65+GST"

**Update Terms:**
• "Update GST to 12%"
• "Change transport to INCLUDED"

**Meta Commands:**
• "Show current draft"
• "Done" (to finalize)

Try one of these formats!`;
  }
  
  return {
    updatedData,
    confirmationMessage
  };
}

// Generate current quotation draft summary
function generateDraftSummary(quotationData) {
  const totalAmount = quotationData.products.reduce((sum, item) => sum + item.amount, 0);
  const validGst = typeof quotationData.gst === 'number' && !isNaN(quotationData.gst) && quotationData.gst >= 0 ? quotationData.gst : 18;
  const gstAmount = totalAmount * (validGst / 100);
  const grandTotal = totalAmount + gstAmount;
  
  return `📋 **Current Quotation Draft**

**Customer:** ${quotationData.customerName}
${quotationData.customerAddress ? `**Address:** ${quotationData.customerAddress}\n` : ''}${quotationData.customerGstin ? `**GSTIN:** ${quotationData.customerGstin}\n` : ''}
**Products:**
${quotationData.products.map((p, index) => `${index + 1}. ${p.description}: ${p.qty}kg @ ₹${p.rate} = ₹${p.amount.toLocaleString()}`).join('\n')}

**Terms:**
• GST: ${validGst}%
• Transport: ${quotationData.transport || 'Not specified'}
• Loading Charges: ${quotationData.loadingCharges || 'Not specified'}
• Payment Terms: ${quotationData.paymentTerms || 'Not specified'}

**Total Summary:**
• Subtotal: ₹${totalAmount.toLocaleString()}
• GST (${validGst}%): ₹${gstAmount.toLocaleString()}  
• **Grand Total: ₹${grandTotal.toLocaleString()}**

What would you like to edit? Or type "done" to generate PDF.`;
}

const AIBA_QUOTE_PROMPT = `
You are AIBA, an AI assistant that generates sales quotations for a steel trading business.

When a user types a quotation request in any natural language format, extract the following fields:

- customerName (string)
- items: array of items with:
  - description (string)
  - quantity (number)
  - unit (kg or nos)
  - rate (number)
- gstPercent (number or empty)
- transport (string or empty)
- loadingCharges (string or empty)
- paymentTerms (string or empty)
- deliveryPeriod (string or empty)
- priceValidity (string or empty)

Return the result as JSON only. Example format:

{
  "customerName": "ABC INDUSTRIES, Coimbatore",
  "items": [
    { "description": "ISMC 100x50", "quantity": 3000, "unit": "kg", "rate": 56 },
    { "description": "MS FLAT 40x6mm", "quantity": 5000, "unit": "kg", "rate": 52 }
  ],
  "gstPercent": 18,
  "transport": "Included",
  "loadingCharges": "Rs.250 per MT",
  "paymentTerms": "Immediate",
  "deliveryPeriod": "Within 2 days",
  "priceValidity": "2 days"
}
`;

export default function ChatBot() {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Checklist quotation states
  const [checklistData, setChecklistData] = useState(null);
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [awaitingMoreItems, setAwaitingMoreItems] = useState(false);
  
  // Quotation flow states
  const [quotationFlow, setQuotationFlow] = useState({
    active: false,
    step: 0,
    data: {
      customerName: '',
      saveCustomer: false,
      products: [],
      currentProduct: { description: '', qty: '', rate: '' },
      gst: 18,
      transport: 'Included',
      loadingCharges: 'Rs.250 per MT extra',
      paymentTerms: '',
      deliveryTerms: '',
      priceValidity: ''
    },
    pendingGeneration: false,
    askingToSaveCustomer: false,
    askingAboutExistingCustomer: false,
    showingCustomerList: false,
    existingCustomers: [],
    originalPrompt: '', // Track original user prompt
    validationResult: null, // Track validation state
    awaitingCompletion: false, // Track if waiting for missing data
    awaitingValidationDecision: false, // Track if waiting for user's decision on validation
    awaitingProductConfirmation: false, // Track if waiting for "yes/no" after adding a product
    structuredMode: false, // Track if we're in step-by-step Q&A mode
    editMode: false, // Track if we're in edit mode
    editingDraft: null // Store the draft being edited
  });

  const quotationSteps = [
    'customerName',
    'saveCustomer', 
    'products',
    'gst',
    'transport',
    'loadingCharges',
    'paymentTerms',
    'deliveryTerms',
    'priceValidity',
    'confirmation'
  ];

  // Fetch business info function
  const fetchBusinessInfo = async () => {
    if (!currentUser) return;
    try {
      const ref = doc(db, 'users', currentUser.uid, 'business', 'info');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setBusinessInfo(snap.data());
        console.log('✅ Business info refreshed:', snap.data());
      }
    } catch (err) {
      console.error('Error fetching business info:', err);
    }
  };

  useEffect(() => {
    fetchBusinessInfo();
  }, [currentUser]);

  // Listen for business info updates
  useEffect(() => {
    const handleBusinessInfoUpdate = (event) => {
      console.log('🔄 Business info update event received:', event.detail);
      fetchBusinessInfo(); // Refresh business info
    };

    window.addEventListener('businessInfoUpdated', handleBusinessInfoUpdate);
    
    return () => {
      window.removeEventListener('businessInfoUpdated', handleBusinessInfoUpdate);
    };
  }, [currentUser]);

  const fetchExistingCustomers = async () => {
    try {
      const customersRef = collection(db, 'users', currentUser.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = [];
      snapshot.forEach((doc) => {
        customers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return customers;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  const saveCustomer = async (customerData) => {
    try {
      // Validate customer name exists and is not empty
      if (!customerData || !customerData.customerName || customerData.customerName.trim() === '') {
        console.error('Error saving customer: customerName is required');
        return false;
      }

      // Clean the customer name to make it a valid document ID
      const cleanCustomerName = customerData.customerName.trim().replace(/[\/\s]+/g, '_');
      
      console.log('Saving customer:', cleanCustomerName);
      
      const customerRef = doc(db, 'users', currentUser.uid, 'customers', cleanCustomerName);
      
      // Check if customer already exists to update frequency
      const existingCustomer = await getDoc(customerRef);
      
      await setDoc(customerRef, {
        name: customerData.customerName.trim(),
        place: customerData.customerAddress || '',
        gstin: customerData.customerGstin || '',
        frequency: existingCustomer.exists() ? (existingCustomer.data().frequency || 0) + 1 : 1,
        lastQuoted: new Date(),
        createdAt: existingCustomer.exists() ? existingCustomer.data().createdAt : new Date(),
        createdBy: currentUser.uid
      });
      
      console.log('Customer saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving customer:', error);
      return false;
    }
  };

  // Fetch frequently billed customers (top 5 by frequency)
  const fetchFrequentlyBilledCustomers = async () => {
    try {
      const customersRef = collection(db, 'users', currentUser.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        customers.push({
          id: doc.id,
          name: data.name,
          frequency: data.frequency || 1,
          lastQuoted: data.lastQuoted,
          ...data
        });
      });
      
      // Sort by frequency (descending) and take top 5
      return customers
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching frequently billed customers:', error);
      return [];
    }
  };

  // Get customer suggestions based on typed input (fuzzy matching)
  const getCustomerSuggestions = async (input) => {
    try {
      if (!input || input.trim().length < 2) return [];
      
      const customersRef = collection(db, 'users', currentUser.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = [];
      
      snapshot.forEach((doc) => {
        customers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      const searchTerm = input.toLowerCase().trim();
      
      // Fuzzy matching - case insensitive, partial match
      const matches = customers.filter(customer => {
        const name = (customer.name || '').toLowerCase();
        const place = (customer.place || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               place.includes(searchTerm) ||
               name.startsWith(searchTerm) ||
               searchTerm.split(' ').some(term => name.includes(term));
      });
      
      // Sort by relevance (exact matches first, then partial)
      return matches.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        
        // Exact match gets highest priority
        if (aName === searchTerm) return -1;
        if (bName === searchTerm) return 1;
        
        // Starts with gets next priority
        if (aName.startsWith(searchTerm)) return -1;
        if (bName.startsWith(searchTerm)) return 1;
        
        // Then by frequency
        return (b.frequency || 1) - (a.frequency || 1);
      }).slice(0, 8); // Limit to 8 suggestions
      
    } catch (error) {
      console.error('Error getting customer suggestions:', error);
      return [];
    }
  };

  // Customer selection state
  const [customerSelectionState, setCustomerSelectionState] = useState({
    active: false,
    searchInput: '',
    suggestions: [],
    frequentCustomers: [],
    showSuggestions: false
  });

  // Handle customer name input with real-time suggestions
  const handleCustomerNameInput = async (input) => {
    setCustomerSelectionState(prev => ({
      ...prev,
      searchInput: input
    }));

    if (input.trim().length >= 2) {
      const suggestions = await getCustomerSuggestions(input);
      setCustomerSelectionState(prev => ({
        ...prev,
        suggestions,
        showSuggestions: suggestions.length > 0
      }));
    } else {
      setCustomerSelectionState(prev => ({
        ...prev,
        suggestions: [],
        showSuggestions: false
      }));
    }
  };

  // Start smart customer selection flow
  const startSmartCustomerSelection = async () => {
    const frequentCustomers = await fetchFrequentlyBilledCustomers();
    
    setCustomerSelectionState({
      active: true,
      searchInput: '',
      suggestions: [],
      frequentCustomers,
      showSuggestions: false
    });

    // Show customer selection interface
    let frequentCustomersText = '';
    if (frequentCustomers.length > 0) {
      frequentCustomersText = `\n\n**📋 Frequently Billed Customers:**\n${frequentCustomers.map((customer, index) => `${index + 1}. ${customer.name} (${customer.frequency} quotes)`).join('\n')}\n\n*Click on a customer name below or type to search...*`;
    }

    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: `Please enter the customer name.${frequentCustomersText}`,
      showPDFButtons: false,
      showCustomerSelection: true,
      frequentCustomers,
      customerSelectionActive: true
    }]);
  };

  // Handle customer selection (either from suggestions or frequent customers)
  const selectCustomer = async (customerName) => {
    setMessages(prev => [...prev, { 
      type: 'user', 
      text: customerName
    }]);

    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: `Customer selected: **${customerName}** — Proceeding with quotation…`
    }]);

    // Reset customer selection state
    setCustomerSelectionState({
      active: false,
      searchInput: '',
      suggestions: [],
      frequentCustomers: [],
      showSuggestions: false
    });

    // Continue with quotation flow
    setQuotationFlow(prev => ({
      ...prev,
      askingAboutExistingCustomer: false,
      active: true,
      step: 2, // Skip customer name and save customer steps
      data: {
        ...prev.data,
        customerName,
        saveCustomer: false // Already exists in database
      },
      structuredMode: true
    }));

    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: `Now, let's add products. Please enter product description:`,
      showPDFButtons: false
    }]);
  };

  const fetchSuggestions = async (input) => {
    try {
      console.log("🔍 fetchSuggestions called with:", input);
      console.log("🔍 Input contains 'quote':", input.toLowerCase().includes("quote"));
      console.log("🔍 Input length:", input.length);
      
      if (input.toLowerCase().includes("quote") && input.length < 30) {
        console.log("🔍 Fetching suggestions from Firestore...");
        const historyRef = collection(db, "users", currentUser.uid, "prompt_history");
        const historySnapshot = await getDocs(historyRef);
        
        console.log("🔍 History snapshot empty?", historySnapshot.empty);
        console.log("🔍 History docs count:", historySnapshot.docs.length);
        
        if (!historySnapshot.empty) {
          // Get recent customer names and items from history
          const recentData = historySnapshot.docs
            .slice(-5) // Last 5 records
            .map(doc => doc.data().structuredData)
            .reverse(); // Most recent first
          
          console.log("🔍 Recent data:", recentData);
          
          const customerSuggestions = [...new Set(recentData.map(data => data.customerName))];
          const itemSuggestions = [...new Set(
            recentData.flatMap(data => 
              data.products?.map(product => product.description) || []
            )
          )].slice(0, 3); // Top 3 items
          
          console.log("🔍 Customer suggestions:", customerSuggestions);
          console.log("🔍 Item suggestions:", itemSuggestions);
          
          const suggestions = [
            ...customerSuggestions.map(customer => ({
              type: 'customer',
              text: `Create quotation for ${customer}`,
              value: customer
            })),
            ...itemSuggestions.map(item => ({
              type: 'item',
              text: `Quote for ${item}`,
              value: item
            }))
          ].slice(0, 5); // Limit to 5 suggestions total
          
          console.log("🔍 Final suggestions:", suggestions);
          
          setSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          console.log("🔍 No history found, hiding suggestions");
        }
      } else {
        console.log("🔍 Conditions not met, hiding suggestions");
        setShowSuggestions(false);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("❌ Error fetching suggestions:", error);
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handlePromptChange = async (value) => {
    setPrompt(value);
    if (currentUser && value.trim()) {
      await fetchSuggestions(value);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion.text);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Debug helper - remove this in production
  const createTestData = async () => {
    try {
      await savePromptHistory(currentUser.uid, "create quotation for ABC Industries", {
        customerName: "ABC Industries, Coimbatore",
        products: [
          { description: "ISMC 100x50", qty: 3000, rate: 56, amount: 168000 },
          { description: "MS FLAT 40x6mm", qty: 2000, rate: 52, amount: 104000 }
        ],
        gst: 18
      });
      await savePromptHistory(currentUser.uid, "quote 5MT steel bars", {
        customerName: "XYZ Corp, Mumbai",
        products: [
          { description: "TMT Bars 12mm", qty: 5000, rate: 58, amount: 290000 }
        ],
        gst: 18
      });
      console.log("✅ Test data created!");
      alert("Test data created! Now try typing 'quote' to see suggestions.");
    } catch (error) {
      console.error("❌ Error creating test data:", error);
    }
  };

  // Debug helper - remove this in production
  const testRegexParser = () => {
    const testInputs = [
      // Original simple format
      "Create quotation for ABC Industries 5MT ISMC 100x50 @ Rs.56 3MT MS FLAT @ Rs.52 GST 18% transport included",
      
      // New multi-line structured format
      `Quote to Sri Energy
1. MS Channel 75x40x6mm
   • 7.14 kg/m × 6 m × 140 Nos = 5,992.8 kg
2. MS Flat 75x10mm  
   • 5.89 kg/m × 6 m × 10 Nos = 353.4 kg
3. MS Angle 40x40x6mm
   • 3.58 kg/m × 6 m × 35 Nos = 752.4 kg
4. MS Flat 50x6mm
   • 2.355 kg/m × 6 m × 300 Nos = 4,239 kg

Flat - 51+ GST
ANGLE AND CHANNEL - 50₹+ GST

Delivery Included
30 days payment`,
      
      // Mixed format
      "Quotation for Golden Granite 10MT TMT bars @ 58 delivery 3 days validity 7 days"
    ];
    
    console.log("🧪 Testing enhanced parser with sample inputs:");
    testInputs.forEach((input, index) => {
      console.log(`\n--- Test ${index + 1} ---`);
      console.log("Input:", input);
      const result = parsePromptWithFallback(input, false); // Test regex only first
      console.log("Result:", result);
      
      if (result.isStructured) {
        console.log("✅ Successfully parsed as structured format");
      } else {
        console.log("ℹ️ Parsed using fallback method");
      }
    });
  };

  // Debug helper - remove this in production
  const testValidationFlow = () => {
    const incompleteData = {
      customerName: "ABC Industries",
      products: [
        { description: "Steel Bars", qty: 5000, rate: 0, amount: 0 } // Missing rate
      ],
      gst: 18,
      transport: "Included"
      // Missing other fields
    };
    
    console.log("🧪 Testing validation with incomplete data:");
    const validation = validateQuotationData(incompleteData);
    console.log("Validation result:", validation);
    
    const message = getValidationMessage(validation);
    console.log("Validation message:", message);
  };

  // 🧠 SMART INPUT VALIDATION - Detects irrelevant input during quotation flow
  const validateStepInput = (userInput, currentStep, currentData = {}) => {
    const input = userInput.trim().toLowerCase();
    
    // Handle special cases first
    if (input.includes('cancel') || input.includes('stop') || input.includes('exit')) {
      return { valid: true, isCancel: true };
    }
    
    switch (currentStep) {
      case 'customerName':
        // Customer name should be at least 2 characters and contain letters
        if (userInput.trim().length < 2 || !/[a-zA-Z]/.test(userInput)) {
          return { 
            valid: false, 
            message: "I need a proper customer name to create the quotation. Could you provide the customer's business name?" 
          };
        }
        return { valid: true };
        
      case 'saveCustomer':
        // Should be yes/no response
        if (!input.includes('yes') && !input.includes('no') && !input.includes('y') && !input.includes('n')) {
          return { 
            valid: false, 
            message: "Just need a quick yes or no — should I save this customer for future quotations?" 
          };
        }
        return { valid: true };
        
      case 'products':
        // For product description, should contain letters
        if (!currentData.currentProduct?.description && (userInput.trim().length < 2 || !/[a-zA-Z]/.test(userInput))) {
          return { 
            valid: false, 
            message: "Just checking — please enter the product description (like 'TMT Bars 12mm' or 'MS Flat 50x6mm')." 
          };
        }
        // For quantity, should be a number
        if (currentData.currentProduct?.description && !currentData.currentProduct?.qty) {
          const qty = parseFloat(userInput);
          if (isNaN(qty) || qty <= 0) {
            return { 
              valid: false, 
              message: "I need the quantity in numbers (like '5000' for 5000 kg). What's the quantity?" 
            };
          }
        }
        // For rate, should be a number
        if (currentData.currentProduct?.description && currentData.currentProduct?.qty && !currentData.currentProduct?.rate) {
          const rate = parseFloat(userInput);
          if (isNaN(rate) || rate <= 0) {
            return { 
              valid: false, 
              message: "Please enter the rate per kg in numbers (like '58' for ₹58 per kg). What's the rate?" 
            };
          }
        }
        return { valid: true };
        
             case 'gst':
         // Should be a number between 0-50 or common phrases
         if (!input.includes('18') && !input.includes('12') && !input.includes('5') && !input.includes('included') && !input.includes('default') && !input.includes('standard')) {
           const gst = parseFloat(userInput);
           if (isNaN(gst) || gst < 0 || gst > 50) {
             return { 
               valid: false, 
               message: "Could you specify the GST percentage? (Usually 18%, 12%, or 5%) Just type the number like '18'." 
             };
           }
         }
         return { valid: true };
        
      case 'transport':
        // Very flexible - almost anything is valid for transport
        return { valid: true };
        
      case 'loadingCharges':
        // Very flexible - almost anything is valid
        return { valid: true };
        
      case 'paymentTerms':
      case 'deliveryTerms':
      case 'priceValidity':
        // Optional fields - anything is valid
        return { valid: true };
        
      case 'confirmation':
        // Should be yes/no response
        if (!input.includes('yes') && !input.includes('no') && !input.includes('y') && !input.includes('n') && 
            !input.includes('generate') && !input.includes('create') && !input.includes('cancel')) {
          return { 
            valid: false, 
            message: "Ready to generate the PDF? Just say 'yes' to create the quotation or 'no' to make changes." 
          };
        }
        return { valid: true };
        
      default:
        return { valid: true };
    }
  };

     // 🔍 DETECT OFF-TOPIC MESSAGES - Checks if user completely changed context
   const detectOffTopicMessage = (userInput) => {
     const offTopicKeywords = [
       'weather', 'hello', 'hi', 'hey', 'help', 'what can you do', 'how are you',
       'good morning', 'good evening', 'time', 'date', 'news', 'sports',
       'different topic', 'something else', 'forget about', 'never mind'
     ];
     
     const input = userInput.toLowerCase();
     return offTopicKeywords.some(keyword => input.includes(keyword));
   };

   // 📝 GET STEP-SPECIFIC PROMPT MESSAGE - Returns appropriate message for each quotation step
   const getStepPromptMessage = (currentStep) => {
     switch (currentStep) {
       case 'customerName':
         return "Let's continue with the customer name. What's the customer's business name?";
       case 'saveCustomer':
         return "Should I save this customer for future quotations? (yes/no)";
       case 'products':
         return "Let's add products. Please enter the product description:";
       case 'gst':
         return "What's the GST percentage for this quotation? (Usually 18%)";
       case 'transport':
         return "Are transport charges included or extra?";
       case 'loadingCharges':
         return "What are the loading charges?";
       case 'paymentTerms':
         return "Any specific payment terms? (optional)";
       case 'deliveryTerms':
         return "Any delivery terms to mention? (optional)";
       case 'priceValidity':
         return "How long should this price be valid for? (optional)";
       case 'confirmation':
         return "Ready to generate the quotation PDF?";
       default:
         return "Let's continue building your quotation.";
     }
   };

  const handleQuotationFlow = async (userInput) => {
    const currentStep = quotationSteps[quotationFlow.step];
    const newData = { ...quotationFlow.data };
    
    // 🧠 VALIDATE INPUT FIRST
    const validation = validateStepInput(userInput, currentStep, newData);
    
    // Handle cancellation request
    if (validation.isCancel) {
      setQuotationFlow(prev => ({ 
        ...prev, 
        active: false, 
        step: 0,
        structuredMode: false
      }));
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Quotation creation cancelled. What else can I help you with?' 
      }]);
      return;
    }
    
         // Handle off-topic detection
     if (detectOffTopicMessage(userInput)) {
       let contextMessage;
       if (newData.customerName) {
         const productCount = newData.products?.length || 0;
         contextMessage = `Looks like we were building a quotation for **${newData.customerName}**${productCount > 0 ? ` (${productCount} products added)` : ''}. Want to continue from where we left off?`;
       } else {
         contextMessage = `Looks like we were building a quotation. Want to continue from where we left off?`;
       }
       
       setMessages(prev => [...prev, { 
         type: 'bot', 
         text: contextMessage,
         showQuotationOptions: true,
         currentStep: currentStep,
         contextData: newData
       }]);
       return;
     }
    
    // Handle invalid input with smart redirection
    if (!validation.valid) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: validation.message
      }]);
      // Stay in the same step - don't advance
      return;
    }
    
    switch (currentStep) {
      case 'customerName':
        newData.customerName = userInput;
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Would you like to save this customer for future use? (yes/no)' 
        }]);
        break;
        
      case 'saveCustomer':
        newData.saveCustomer = userInput.toLowerCase().includes('yes');
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Now, let\'s add products. Please enter product description:' 
        }]);
        break;
        
      case 'products':
        if (!newData.currentProduct.description) {
          newData.currentProduct.description = userInput;
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Enter quantity (in kg):' 
          }]);
          return;
        } else if (!newData.currentProduct.qty) {
          newData.currentProduct.qty = parseFloat(userInput);
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Enter rate per kg (₹):' 
          }]);
          return;
        } else if (!newData.currentProduct.rate) {
          newData.currentProduct.rate = parseFloat(userInput);
          const amount = newData.currentProduct.qty * newData.currentProduct.rate;
          newData.products.push({
            ...newData.currentProduct,
            amount
          });
          newData.currentProduct = { description: '', qty: '', rate: '' };
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `Product added! Total products: ${newData.products.length}. Add another product? Type "yes" to add more or "no" to continue.` 
          }]);
          
          // Set the awaiting confirmation flag instead of trying to handle response immediately
          setQuotationFlow(prev => ({
            ...prev,
            awaitingProductConfirmation: true,
            data: newData
          }));
          return;
        }
        break;
        
      case 'gst':
        const inputGst = userInput ? parseFloat(userInput) : 18;
        // Validate GST is a proper number
        newData.gst = typeof inputGst === 'number' && !isNaN(inputGst) && inputGst >= 0 ? inputGst : 18;
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Enter transport charges (or "Included"):' 
        }]);
        break;
        
      case 'transport':
        newData.transport = userInput || 'Included';
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Enter loading charges:' 
        }]);
        break;
        
      case 'loadingCharges':
        newData.loadingCharges = userInput || 'Rs.250 per MT extra';
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Enter payment terms (optional):' 
        }]);
        break;
        
      case 'paymentTerms':
        newData.paymentTerms = userInput;
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Enter delivery terms (optional):' 
        }]);
        break;
        
      case 'deliveryTerms':
        newData.deliveryTerms = userInput;
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Enter price validity period (optional):' 
        }]);
        break;
        
      case 'priceValidity':
        newData.priceValidity = userInput;
        const totalAmount = newData.products.reduce((sum, item) => sum + item.amount, 0);
        
        // Ensure GST is valid before doing calculations
        const validGst = typeof newData.gst === 'number' && !isNaN(newData.gst) && newData.gst >= 0 ? newData.gst : 18;
        const gstAmount = totalAmount * (validGst / 100);
        const grandTotal = totalAmount + gstAmount;
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `Quotation Summary:
          
Customer: ${newData.customerName}
Products: ${newData.products.length} items
Subtotal: ₹${totalAmount.toLocaleString()}
GST (${validGst}%): ₹${gstAmount.toLocaleString()}
Grand Total: ₹${grandTotal.toLocaleString()}

Ready to generate the quotation PDF with the above details? (yes/no)` 
        }]);
        break;
        
      case 'confirmation':
        if (userInput.toLowerCase().includes('yes')) {
          if (newData.saveCustomer) {
            await saveCustomer(newData);
          }
          await generateQuotationPDF(newData);
          setQuotationFlow({
            active: false,
            step: 0,
            data: {
              customerName: '',
              saveCustomer: false,
              products: [],
              currentProduct: { description: '', qty: '', rate: '' },
              gst: 18,
              transport: 'Included',
              loadingCharges: 'Rs.250 per MT extra',
              paymentTerms: '',
              deliveryTerms: '',
              priceValidity: ''
            },
            pendingGeneration: false,
            originalPrompt: '',
            askingToSaveCustomer: false,
            askingAboutExistingCustomer: false,
            showingCustomerList: false,
            existingCustomers: [],
            validationResult: null,
            awaitingCompletion: false,
            awaitingValidationDecision: false,
            awaitingProductConfirmation: false,
            structuredMode: false,
            editMode: false,
            editingDraft: null
          });
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Quotation PDF generated successfully!' 
          }]);
        } else {
          setQuotationFlow(prev => ({ 
            ...prev, 
            active: false, 
            step: 0, 
            originalPrompt: '',
            awaitingProductConfirmation: false,
            structuredMode: false
          }));
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Quotation creation cancelled.' 
          }]);
        }
        return;
    }
    
    setQuotationFlow(prev => ({
      ...prev,
      step: prev.step + 1,
      data: newData
    }));
  };

  const generateQuotationPDF = async (quotationData) => {
    try {
      // Fetch latest business info before generating PDF
      const ref = doc(db, 'users', currentUser.uid, 'business', 'info');
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        alert('Business information not found. Please set up your business details first.');
        return;
      }

      const businessInfo = snap.data();
      
      // CRITICAL DEBUG: Log everything to understand data corruption
      console.log('🔍 DEBUGGING BUSINESS INFO:');
      console.log('Raw businessInfo from Firestore:', businessInfo);
      console.log('Type of businessInfo:', typeof businessInfo);
      console.log('Keys in businessInfo:', Object.keys(businessInfo || {}));
      
      // Check each field individually
      console.log('businessName:', businessInfo?.businessName, typeof businessInfo?.businessName);
      console.log('address:', businessInfo?.address, typeof businessInfo?.address);
      console.log('bankName:', businessInfo?.bankName, typeof businessInfo?.bankName);
      console.log('bankAccount:', businessInfo?.bankAccount, typeof businessInfo?.bankAccount);
      console.log('ifsc:', businessInfo?.ifsc, typeof businessInfo?.ifsc);
      console.log('bankBranch:', businessInfo?.bankBranch, typeof businessInfo?.bankBranch);
      
      // Check if any field contains product data
      Object.entries(businessInfo || {}).forEach(([key, value]) => {
        if (typeof value === 'string' && (value.includes('Channel') || value.includes('kg/m') || value.includes('Nos'))) {
          console.error(`🚨 CONTAMINATED FIELD: ${key} = ${value}`);
        }
      });
      
      // EMERGENCY PROTECTION: Stop PDF generation if business info is corrupted
      const hasCorruptedData = Object.values(businessInfo || {}).some(value => 
        typeof value === 'string' && (
          value.includes('Channel') || 
          value.includes('kg/m') || 
          value.includes('Nos') ||
          value.includes('Flat') ||
          value.includes('Angle') ||
          value.includes('GST')
        )
      );
      
      if (hasCorruptedData) {
        alert('🚨 ERROR: Business information appears to be corrupted with quotation data. Please go to Business Setup and re-enter your business details.');
        console.error('🚨 ABORTING PDF generation due to corrupted business info');
        return;
      }
      
      const documentNumber = `QUO_${Date.now()}`;
      const date = new Date().toLocaleDateString('en-IN');
      
      const totalQty = quotationData.products.reduce((sum, item) => sum + item.qty, 0);
      const taxableAmount = quotationData.products.reduce((sum, item) => sum + item.amount, 0);
      
      // Ensure GST is valid before doing calculations
      const validGst = typeof quotationData.gst === 'number' && !isNaN(quotationData.gst) && quotationData.gst >= 0 ? quotationData.gst : 18;
      const gstAmount = taxableAmount * (validGst / 100);
      const grandTotal = taxableAmount + gstAmount;

      // Initialize jsPDF document instance
      const pdfDoc = new jsPDF();
      let y = 15;

      // DEBUG: Add layout guides (remove in production)
      // pdfDoc.setDrawColor(200, 200, 200);
      // pdfDoc.rect(10, 10, 190, 270); // page boundary
      // pdfDoc.line(140, 0, 140, 297); // vertical divider at x=140

      // Document number and date (top-right) - FIXED POSITION
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Document #: ', 150, 15);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(documentNumber, 175, 15);
      
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Date: ', 150, 23);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(date, 165, 23);

      // Company Name and Address (Left side - with proper wrapping)
      pdfDoc.setFontSize(18);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(businessInfo.businessName, 14, y);
      y += 10;

      // Address with text wrapping to prevent overflow
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'normal');
      const maxAddressWidth = 130; // Leave space for right-side content
      const addressLines = pdfDoc.splitTextToSize(businessInfo.address, maxAddressWidth);
      
      // Render each address line
      addressLines.forEach(line => {
        pdfDoc.text(line, 14, y);
        y += 5;
      });
      
      y += 3; // Extra spacing after address
      pdfDoc.text(`GSTIN: ${businessInfo.gstin}`, 14, y);
      y += 6;
      pdfDoc.text(`Email: ${businessInfo.email}`, 14, y);
      y += 10;

      // To: Customer
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(`To: ${quotationData.customerName}`, 14, y);
      y += 10;

      // Table
      const tableBody = quotationData.products.map(item => [
        item.description,
        item.qty.toLocaleString() + ' kg',
        `Rs.${item.rate}`,
        `Rs.${item.amount.toLocaleString()}`
      ]);
      
      // Summary rows
      tableBody.push([
        { content: 'Total Quantity', colSpan: 1, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
        { content: `${totalQty.toLocaleString()} kg`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
      ]);
      tableBody.push([
        { content: 'Taxable Amount', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
        { content: `Rs.${taxableAmount.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
      ]);
      tableBody.push([
        { content: `Add: GST (${validGst}%)`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
        { content: `Rs.${gstAmount.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
      ]);
      tableBody.push([
        { content: 'Grand Total', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [180,180,180] } },
        { content: `Rs.${grandTotal.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [180,180,180] } }
      ]);

      autoTable(pdfDoc, {
        head: [[
          'Description',
          'Qty (kg)',
          'Rate',
          'Amount'
        ]],
        body: tableBody,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [60,60,60], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        bodyStyles: { fontSize: 11 },
        styles: { 
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 80 },  // Description column
          1: { cellWidth: 30 },  // Quantity column  
          2: { cellWidth: 30 },  // Rate column
          3: { cellWidth: 40 }   // Amount column
        },
        didParseCell: function (data) {
          if (data.row.index >= quotationData.products.length) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: function (data) {
          // Ensure table doesn't interfere with other sections
          console.log('Table completed at Y position:', data.cursor.y);
        }
      });

      // CRITICAL FIX: Reset Y position after table to prevent content bleeding
      y = pdfDoc.lastAutoTable.finalY + 15;

      // Transport and Loading Charges box
      pdfDoc.setDrawColor(0);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.rect(14, y, 182, 30);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Transport:', 18, y + 10);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(quotationData.transport, 45, y + 10);
      
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Loading Charges:', 18, y + 20);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(quotationData.loadingCharges, 60, y + 20);
      
      // Move to next section with proper spacing
      y += 40;

      // DEBUG: Log bank info to ensure we have correct data
      console.log('Bank Info Debug:', {
        bankDetails: businessInfo.bankDetails,
        // Legacy fallback for old structure
        legacyBankName: businessInfo.bankName,
        legacyBankAccount: businessInfo.bankAccount,
        legacyIfsc: businessInfo.ifsc,
        legacyBankBranch: businessInfo.bankBranch
      });

      // Bank Details box - COMPLETELY ISOLATED SECTION WITH SAFETY MEASURES
      const bankDetailsY = y; // Lock the Y position for bank section
      
      // CRITICAL: Create isolated bank data object to prevent any cross-contamination
      const safeBankData = {
        bankName: businessInfo.bankName || 'Not Specified',
        accountNumber: businessInfo.bankAccount || 'Not Specified', 
        ifscCode: businessInfo.ifsc || 'Not Specified',
        branchName: businessInfo.branch || 'Main Branch'
      };
      
      // DEBUG: Verify safe bank data doesn't contain product info
      console.log('Safe Bank Data:', safeBankData);
      Object.values(safeBankData).forEach(value => {
        if (typeof value === 'string' && (value.includes('Channel') || value.includes('Flat') || value.includes('kg'))) {
          console.error('⚠️ DANGER: Bank data contains product information!', value);
          alert('Error: Bank details contain product data. Please check business setup.');
        }
      });
      
      // Clear any potential artifacts by resetting graphics state
      pdfDoc.setDrawColor(0);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.setTextColor(0, 0, 0); // Ensure black text
      
      // Draw bank details box with extra margin
      pdfDoc.rect(14, bankDetailsY, 182, 45);
      
      // Bank Details Header
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setFontSize(11);
      pdfDoc.text('Bank Details:', 18, bankDetailsY + 12);
      
      // Bank Details Content - USE ONLY safeBankData
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(10);
      
      // Line 1: Account Number
      pdfDoc.text(`Acc No: ${safeBankData.accountNumber}`, 18, bankDetailsY + 22);
      
      // Line 2: IFSC Code
      pdfDoc.text(`IFSC Code: ${safeBankData.ifscCode}`, 18, bankDetailsY + 30);
      
      // Line 3: Bank Name
      pdfDoc.text(`Bank: ${safeBankData.bankName}`, 18, bankDetailsY + 38);
      
      // Line 4: Branch (right side)
      pdfDoc.text(`Branch: ${safeBankData.branchName}`, 110, bankDetailsY + 30);

      // Final Y position update with extra spacing
      y = bankDetailsY + 50;

      // Save the PDF
      pdfDoc.save(`quotation_${quotationData.customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      
      // Save prompt history after successful PDF generation
      if (quotationFlow.originalPrompt) {
        await savePromptHistory(currentUser.uid, quotationFlow.originalPrompt, quotationData);
        await fetchSuggestions(quotationFlow.originalPrompt);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const sendToOpenAI = async (userMessage) => {
    try {
      const messages = [
        { role: "system", content: AIBA_QUOTE_PROMPT },
        { role: "user", content: userMessage } // userMessage is your chat field
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.2
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      try {
        const extractedData = JSON.parse(data.choices[0].message.content);
        return extractedData;
      } catch (parseError) {
        // If it's not valid JSON, return the raw response (for non-quotation requests)
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  };

  const convertToQuotationFormat = (extractedData) => {
    // Ensure GST is a valid number with proper default
    const gst = extractedData.gstPercent || 18;
    const validGst = typeof gst === 'number' && !isNaN(gst) ? gst : 18;
    
    return {
      customerName: extractedData.customerName,
      saveCustomer: false,
      products: extractedData.items.map(item => ({
        description: item.description,
        qty: item.quantity * (item.unit === 'MT' ? 1000 : 1), // Convert MT to kg
        rate: item.rate,
        amount: (item.quantity * (item.unit === 'MT' ? 1000 : 1)) * item.rate
      })),
      gst: validGst,
      transport: extractedData.transport || 'Included',
      loadingCharges: extractedData.loadingCharges || 'Rs.250 per MT extra',
      paymentTerms: extractedData.paymentTerms || '',
      deliveryTerms: extractedData.deliveryPeriod || '',
      priceValidity: extractedData.priceValidity || ''
    };
  };

  // Steel estimation detection
  const detectSteelEstimationRequest = (prompt) => {
    const steelKeywords = [
      'ISMB', 'RSJ', 'ISMC', 'ISA', 'HR SHEET', 'CR SHEET', 'MS PIPE', 'MS SQUARE', 'MS RECT', 'MS FLAT', 'MS ROUND',
      'steel', 'quotation', 'estimate', 'rate', 'nos', '@', '+GST', 'To ', 'customer'
    ];
    
    const hasSteel = steelKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasQuantityRate = /\d+\s*nos?\s*@\s*\d+/i.test(prompt);
    const hasCustomer = /to\s+[^,\n]+,/i.test(prompt);
    
    return hasSteel && (hasQuantityRate || hasCustomer);
  };

  // Steel estimation handler
  const handleSteelEstimation = async (userPrompt) => {
    try {
      console.log('🔧 Processing steel estimation for:', userPrompt);
      
      // Parse the prompt to extract customer and items using enhanced parser
      const parsedData = await parsePromptWithFallback(userPrompt, true);
      const validation = validateParsedData(parsedData);
      
      if (!validation.success) {
        return {
          success: false,
          message: `I couldn't parse your steel estimation request properly. Here are the issues:\n\n${validation.errors.join('\n')}\n\nPlease provide steel items in format: "ITEM_NAME - QTY Nos @ RATE+GST"`
        };
      }

      // Calculate weights and estimate values
      const estimationResults = {
        customer: parsedData.customer || 'Unknown Customer',
        items: [],
        totalWeight: 0,
        totalValue: 0,
        gstAmount: 0,
        grandTotal: 0,
        warnings: [],
        transport: parsedData.transport,
        loading: parsedData.loading,
        gst: parsedData.gst || 18
      };

      parsedData.items.forEach((item, index) => {
        const { description, quantity, rate, actualWeight, amount, warnings } = item;
        
        // Use the calculated weight from parsePrompt (which now integrates calculateWeight)
        const totalWeight = actualWeight || 0;
        const value = amount || 0;
        
        estimationResults.items.push({
          description,
          quantity,
          rate: rate || 0,
          weight: totalWeight,
          totalWeight,
          value,
          status: totalWeight > 0 ? 'found' : 'unknown_item',
          matchScore: item.matchScore,
          warnings: warnings || []
        });

        estimationResults.totalWeight += totalWeight;
        estimationResults.totalValue += value;
        
        // Add any warnings from the item
        if (warnings && warnings.length > 0) {
          estimationResults.warnings.push(...warnings);
        }
      });

      // Calculate GST
      estimationResults.gstAmount = estimationResults.totalValue * (estimationResults.gst / 100);
      estimationResults.grandTotal = estimationResults.totalValue + estimationResults.gstAmount;

      // Add validation warnings
      if (validation.warnings && validation.warnings.length > 0) {
        estimationResults.warnings.push(...validation.warnings);
      }

      // Format response
      let responseMessage = `## Steel Estimation for ${estimationResults.customer}\n\n`;
      
      if (parsedData.aiParsed) {
        responseMessage += `🤖 *Parsed using AI assistance*\n\n`;
      }
      
      if (estimationResults.warnings.length > 0) {
        responseMessage += `⚠️ **Warnings:**\n${estimationResults.warnings.map(w => `- ${w}`).join('\n')}\n\n`;
      }

      responseMessage += `**Items Breakdown:**\n`;
      estimationResults.items.forEach((item, index) => {
        responseMessage += `\n${index + 1}. **${item.description}**\n`;
        responseMessage += `   - Quantity: ${item.quantity} Nos\n`;
        
        if (item.rate > 0) {
          responseMessage += `   - Rate: ₹${item.rate} per kg\n`;
        } else {
          responseMessage += `   - Rate: Not specified\n`;
        }
        
        if (item.status === 'found' && item.totalWeight > 0) {
          responseMessage += `   - Total weight: ${item.totalWeight.toFixed(2)} kg\n`;
        }
        
        if (item.matchScore && item.matchScore < 1.0) {
          responseMessage += `   - Match confidence: ${(item.matchScore * 100).toFixed(1)}%\n`;
        }
        
        if (item.value > 0) {
          responseMessage += `   - Value: ₹${item.value.toLocaleString()}\n`;
        }
      });

      responseMessage += `\n**Summary:**\n`;
      responseMessage += `- Total Weight: ${estimationResults.totalWeight.toFixed(2)} kg\n`;
      responseMessage += `- Subtotal: ₹${estimationResults.totalValue.toLocaleString()}\n`;
      responseMessage += `- GST (${estimationResults.gst}%): ₹${estimationResults.gstAmount.toLocaleString()}\n`;
      responseMessage += `- **Grand Total: ₹${estimationResults.grandTotal.toLocaleString()}**\n`;

      if (estimationResults.transport) {
        responseMessage += `\n**Transport:** ${estimationResults.transport}\n`;
      }

      if (estimationResults.loading) {
        responseMessage += `**Loading:** ${estimationResults.loading}\n`;
      }

      // Convert to quotation format for PDF generation with defaults applied
      const quotationData = applyFallbackDefaults({
        customerName: estimationResults.customer,
        saveCustomer: false,
        products: estimationResults.items.map(item => ({
          description: item.description,
          qty: item.totalWeight > 0 ? item.totalWeight.toFixed(2) : item.quantity,
          rate: item.rate,
          amount: item.value
        })),
        gst: estimationResults.gst,
        transport: estimationResults.transport,
        loadingCharges: estimationResults.loading,
        paymentTerms: '',
        deliveryTerms: '',
        priceValidity: ''
      });

      return {
        success: true,
        message: responseMessage,
        showQuotation: true,
        data: estimationResults,
        quotationData: quotationData
      };

    } catch (error) {
      console.error('Steel estimation error:', error);
      return {
        success: false,
        message: `Error processing steel estimation: ${error.message}`
      };
    }
  };

  const hybridParseQuotation = async (userMessage) => {
    console.log("🤖 Starting hybrid parsing for:", userMessage);
    
    // Try regex parsing first (faster, no API cost)
    try {
      console.log("🔧 Trying regex parser...");
      const regexData = parseQuotationPrompt(userMessage);
      
      // Check if regex found meaningful data
      if (regexData.customerName && regexData.items.length > 0) {
        console.log("✅ Regex parser successful!");
        return regexData;
      } else {
        console.log("⚠️ Regex parser incomplete, trying OpenAI...");
      }
    } catch (error) {
      console.error("❌ Regex parser failed:", error);
    }
    
    // Fallback to OpenAI if regex fails or incomplete
    try {
      console.log("🤖 Trying OpenAI parser...");
      const aiResponse = await sendToOpenAI(userMessage);
      
      if (typeof aiResponse === 'object' && aiResponse.customerName && aiResponse.items) {
        console.log("✅ OpenAI parser successful!");
        return aiResponse;
      } else {
        console.log("⚠️ OpenAI returned text response, not structured data");
        return null;
      }
    } catch (error) {
      console.error("❌ OpenAI parser failed:", error);
      return null;
    }
  };

  // Helper function to detect user intent from short responses
  const detectUserIntent = (input) => {
    const text = input.toLowerCase().trim();
    
    // Affirmative responses
    const affirmativePatterns = [
      'yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'fine', 'good', 
      'proceed', 'continue', 'go ahead', 'generate', 'create', 'do it',
      'save', 'confirm', 'agree', 'accept', 'correct', 'right'
    ];
    
    // Negative responses  
    const negativePatterns = [
      'no', 'n', 'nope', 'cancel', 'stop', 'skip', 'abort', 'decline',
      'dont', 'don\'t', 'not now', 'later', 'never mind'
    ];
    
    if (affirmativePatterns.some(pattern => text === pattern || text.includes(pattern))) {
      return 'affirmative';
    }
    
    if (negativePatterns.some(pattern => text === pattern || text.includes(pattern))) {
      return 'negative';
    }
    
    return 'neutral';
  };

  // 🛡️ DETECT VAGUE/SOFT INPUTS DURING QUOTATION FLOW
  const handleSoftInputDuringQuotation = (userInput, currentStep) => {
    const input = userInput.toLowerCase().trim();
    
    // ⚠️ CRITICAL: Don't treat 'yes'/'no' as vague when in confirmation step or saveCustomer step
    if (currentStep === 'confirmation' || currentStep === 'saveCustomer') {
      const intent = detectUserIntent(input);
      if (intent === 'affirmative' || intent === 'negative') {
        return null; // Let normal processing handle yes/no responses
      }
    }
    
    // List of vague/soft inputs that don't help with quotation building
    const vaguePhrases = [
      'yes', 'ok', 'okay', 'fine', 'cool', 'alright', 'sure', 'good',
      'hello', 'hi', 'hey', 'you there', 'ready', 'continue', 'go',
      'thanks', 'thank you', 'noted', 'got it', 'understood', 'right'
    ];
    
    if (vaguePhrases.includes(input)) {
      // Return context-appropriate redirect message
      switch (currentStep) {
        case 'customerName':
          return "Got it — let's continue. What's the customer's business name?";
        case 'saveCustomer':
          return "Noted. Should I save this customer for future quotations? (yes/no)";
        case 'products':
          const currentProduct = quotationFlow.data.currentProduct || {};
          if (!currentProduct.description) {
            return "We're building a quote. What's the product description?";
          } else if (!currentProduct.qty) {
            return "Cool. What's the quantity in kg?";
          } else if (!currentProduct.rate) {
            return "Got it. What's the rate per kg?";
          }
          return "Just checking — please enter the next product details.";
        case 'gst':
          return "Noted. What's the GST percentage? (Usually 18%)";
        case 'transport':
          return "Got it. Are transport charges included or extra?";
        case 'loadingCharges':
          return "Cool. What are the loading charges?";
        case 'paymentTerms':
          return "Thanks. Any payment terms to mention?";
        case 'deliveryTerms':
          return "Noted. Any delivery terms?";
        case 'priceValidity':
          return "Got it. How long should this price be valid?";
        case 'confirmation':
          return "Ready to generate the PDF? Say 'yes' to create or 'no' to edit.";
        default:
          return "Let's continue with the quotation. What's next?";
      }
    }
    
    return null; // Not a vague input, let normal processing continue
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'user', text: prompt }]);
      
      // 🧠 NEW STATE MANAGER INTEGRATION
      console.log('🧠 State Manager: Current state:', chatbotStateManager.getStateSummary());
      const routing = chatbotStateManager.routeMessage(prompt);
      console.log('🎯 State Manager: Routing decision:', routing);
      
      // Try new prompt parser first for quotation intents
      if (routing.action === 'start_quotation' || routing.intent === 'quotation_intent') {
        console.log('🔍 Trying new prompt parser for quotation...');
        const parseResult = await promptParser.parsePromptToQuote(prompt);
        
        // ✅ Handle clarification requests
        if (parseResult.needsClarification) {
          console.log('❓ Parser requesting clarification:', parseResult.missingFields);
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: parseResult.clarificationMessage,
            showPDFButtons: false
          }]);
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        if (parseResult.confidence > 70 && parseResult.customerName !== "Not specified" && parseResult.products.length > 0) {
          console.log('✅ High confidence parse, generating quotation directly');
          
          // Update state manager
          chatbotStateManager.setIntent('quotation_intent', {
            quotationStep: 'finalize',
            quotationDraft: parseResult
          });
          
          // Convert to quotation format and show preview
          const quotationData = {
            customerName: parseResult.customerName,
            products: parseResult.products,
            gst: parseResult.gst,
            transport: parseResult.transport,
            loadingCharges: parseResult.loadingCharges,
            paymentTerms: parseResult.paymentTerms,
            priceValidity: parseResult.priceValidity
          };
          
          const summary = generateQuotationSummary(quotationData);
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `🎯 **Smart Quotation Generated!**\n\n${summary}\n\n✅ Ready to generate PDF?`,
            showPDFButtons: true
          }]);
          
          setQuotationFlow(prev => ({
            ...prev,
            data: quotationData,
            pendingGeneration: true,
            originalPrompt: prompt
          }));
          
          setPrompt('');
          setIsLoading(false);
          return;
        }
      }
      
      // 🛡️ QUOTATION CONTEXT GUARD - Highest Priority Check
      // Prevent fallback to general classification during quotation flow
      if (quotationFlow.active || quotationFlow.askingAboutExistingCustomer || 
          quotationFlow.showingCustomerList || quotationFlow.pendingGeneration || 
          customerSelectionState.active) {
        
        console.log('🏗️ Quotation context active, bypassing general classification');
        
        // 🚨 PRIORITY: Handle PDF generation confirmation immediately
        if (quotationFlow.pendingGeneration) {
          console.log('🔥 PDF Generation pending, handling confirmation:', prompt);
          await handlePDFConfirmation(prompt);
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        // Handle soft/vague inputs during quotation flow
        if (quotationFlow.active && quotationFlow.structuredMode) {
          const currentStep = quotationSteps[quotationFlow.step];
          const softInputResponse = handleSoftInputDuringQuotation(prompt, currentStep);
          
          if (softInputResponse) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: softInputResponse
            }]);
            setPrompt('');
            setIsLoading(false);
            return;
          }
        }
      }

      // 🛠️ HANDLE EDIT MODE - Process natural language edits (PRIORITY CHECK)
      console.log('🔍 Checking edit mode status:', quotationFlow.editMode);
      if (quotationFlow.editMode) {
        console.log('🛠️ Edit mode is active, processing edit command:', prompt);
        console.log('🛠️ Current quotationFlow state:', quotationFlow);
        
        // Safety check - ensure we have a draft to edit
        if (!quotationFlow.editingDraft) {
          console.error('❌ Edit mode active but no editing draft found');
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: '❌ Edit mode error: No draft found to edit. Please create a new quotation.',
            showPDFButtons: false
          }]);
          setQuotationFlow(prev => ({ ...prev, editMode: false }));
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        await handleEditMode(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      // 📋 HANDLE CHECKLIST QUOTATION MODE
      if (isChecklistMode && checklistData?.checklist) {
        console.log('📋 Checklist mode active, processing input:', prompt);
        
        // Check for checklist commands first
        if (isChecklistCommand(prompt)) {
          const commandResult = handleChecklistCommand(prompt, checklistData.checklist, {
            awaitingMoreItems
          });
          
          if (commandResult) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: commandResult.response,
              showPDFButtons: commandResult.showPDFButtons || false
            }]);
            
            // Update checklist data
            if (commandResult.checklistData) {
              setChecklistData(commandResult.checklistData);
            }
            
            setPrompt('');
            setIsLoading(false);
            return;
          }
        }
        
        // Process regular checklist input
        const checklistResult = await handleChecklistQuotation(prompt, checklistData.checklist, {
          awaitingMoreItems
        });
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: checklistResult.response,
          showPDFButtons: checklistResult.showPDFButtons || false
        }]);
        
        // Update states based on result
        if (checklistResult.checklistData) {
          setChecklistData(checklistResult.checklistData);
        }
        
        if (checklistResult.awaitingMoreItems !== undefined) {
          setAwaitingMoreItems(checklistResult.awaitingMoreItems);
        }
        
        // Handle completion
        if (checklistResult.checklistComplete) {
          setIsChecklistMode(false);
          setAwaitingMoreItems(false);
          
          // Convert checklist data to quotation format for PDF generation
          const quotationData = exportChecklistData(checklistData.checklist);
          setQuotationFlow(prev => ({
            ...prev,
            data: quotationData,
            pendingGeneration: true,
            originalPrompt: prompt
          }));
        }
        
        setPrompt('');
        setIsLoading(false);
        return;
      }

      // Handle context-aware responses for active flows
      if (quotationFlow.active) {
        // Special handling for product confirmation step
        if (quotationFlow.awaitingProductConfirmation) {
          const intent = detectUserIntent(prompt);
          if (intent === 'affirmative') {
            // Continue adding products
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Great! Please enter the next product description:' 
            }]);
            setQuotationFlow(prev => ({
              ...prev,
              awaitingProductConfirmation: false,
              data: {
                ...prev.data,
                currentProduct: { description: '', qty: '', rate: '' }
              }
            }));
          } else if (intent === 'negative') {
            // Move to next step
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Perfect! Now let\'s set the GST percentage (usually 18%):' 
            }]);
            setQuotationFlow(prev => ({
              ...prev,
              step: prev.step + 1,
              awaitingProductConfirmation: false
            }));
          } else {
            // Invalid response for product confirmation
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Would you like to add another product? Just say "yes" to add more or "no" to continue with GST details.' 
            }]);
          }
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        await handleQuotationFlow(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      // Handle smart customer selection flow
      if (customerSelectionState.active) {
        if (customerSelectionState.showSuggestions && customerSelectionState.suggestions.length > 0) {
          // Check if user typed a customer name that matches suggestions
          const matchingSuggestion = customerSelectionState.suggestions.find(
            suggestion => suggestion.name.toLowerCase() === prompt.toLowerCase().trim()
          );
          if (matchingSuggestion) {
            await selectCustomer(matchingSuggestion.name);
            setPrompt('');
            setIsLoading(false);
            return;
          }
        }
        
        // Check if user typed a number for frequent customers
        const customerIndex = parseInt(prompt.trim()) - 1;
        if (customerIndex >= 0 && customerIndex < customerSelectionState.frequentCustomers.length) {
          const selectedCustomer = customerSelectionState.frequentCustomers[customerIndex];
          await selectCustomer(selectedCustomer.name);
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        // Otherwise, treat as new customer name
        if (prompt.trim()) {
          await selectCustomer(prompt.trim());
          setPrompt('');
          setIsLoading(false);
          return;
        }
      }

      // Handle special context states
      if (quotationFlow.askingAboutExistingCustomer) {
        await handleExistingCustomerResponse(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      if (quotationFlow.showingCustomerList) {
        await handleCustomerSelection(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      if (quotationFlow.pendingGeneration) {
        await handlePDFConfirmation(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }

      // 🎯 NEW INTENT ROUTING SYSTEM - Only when NOT in specific quotation context
      console.log('🎯 Using new intent routing system for message:', prompt);
      
      // Prepare context for intent routing
      const intentContext = validateAndEnrichContext({
        quotationActive: quotationFlow.active,
        quotationData: quotationFlow.data,
        awaitingConfirmation: quotationFlow.pendingGeneration,
        hasRecentQuotations: messages.some(m => m.showPDFButtons),
        hasCustomers: true // Assume true for now, could be dynamic
      });

      // Route through new intent system
      const intentResult = await routeIntent(prompt, intentContext);
      console.log('🎯 Intent routing result:', intentResult);

      // Handle responses based on intent result
      if (!intentResult.requiresProcessing) {
        // Direct response - show immediately
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: intentResult.response,
          showPDFButtons: intentResult.showPDFButtons || false,
          showFeatures: intentResult.showFeatures || false
        }]);
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Process different types based on intent result
      switch (intentResult.processingType) {
        case "quotation_create":
          await startSmartCustomerSelection();
          break;
          
        case "guided_quotation":
          // Set up guided quotation flow
          setQuotationFlow(prev => ({ 
            ...prev, 
            askingAboutExistingCustomer: true,
            originalPrompt: prompt
          }));
          break;
          
        case "checklist_quotation":
          // Start checklist-based quotation
          if (intentResult.checklistData) {
            setChecklistData(intentResult.checklistData);
            setIsChecklistMode(true);
            setAwaitingMoreItems(false);
          }
          break;
          
        case "apply_edit":
          // Apply edit using existing edit system
          if (quotationFlow.data && intentResult.editData) {
            const updatedData = applyEditToQuotation(quotationFlow.data, intentResult.editData);
            setQuotationFlow(prev => ({ ...prev, data: updatedData }));
          }
          break;
          
        case "knowledge":
          await handleKnowledgeQuery(prompt);
          break;
          
        case "steel_estimation":
          // Handle steel estimation using existing system
          const estimationResult = await handleSteelEstimation(prompt);
          if (estimationResult.success) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: estimationResult.message,
              isEstimation: true,
              showPDFButtons: true,
              quotationData: estimationResult.quotationData
            }]);
            
            if (estimationResult.quotationData) {
              setQuotationFlow(prev => ({
                ...prev,
                data: estimationResult.quotationData,
                pendingGeneration: true,
                originalPrompt: prompt
              }));
            }
          } else {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: estimationResult.message,
              showPDFButtons: false
            }]);
          }
          break;
          
        case "confirm_action":
        case "continue_quotation":
          // Handle contextual confirmations
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: "Let's continue! What would you like to do next?"
          }]);
          break;
          
        default:
          // Fallback to existing quotation request handler for complex cases
          await handleQuotationRequest(prompt);
      }

    } catch (error) {
      console.error('Error in handleSend:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  // 🧠 KNOWLEDGE QUERY HANDLER
  const handleKnowledgeQuery = async (userPrompt) => {
    const knowledgeResponse = generateSteelResponse(userPrompt);
    
    if (knowledgeResponse) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: knowledgeResponse,
        showPDFButtons: false
      }]);
    } else {
      // Fallback for questions not in knowledge base
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: `I'd be happy to help with your steel business question! 

For specific technical details, current market rates, or product specifications, I can provide expert guidance. You can also:

• **Ask about steel types**: "TMT vs MS difference"
• **Request quotations**: "Quote for 5MT steel bars"  
• **Market insights**: "Current steel rates"
• **Business advice**: "Steel trading tips"

What specific information are you looking for?`,
        showPDFButtons: false
      }]);
    }
  };

  // 📋 QUOTATION REQUEST HANDLER  
  const handleQuotationRequest = async (userPrompt) => {
    console.log('🔧 Processing quotation request:', userPrompt);

    // Check if this is a steel estimation request
    if (detectSteelEstimationRequest(userPrompt)) {
      const estimationResult = await handleSteelEstimation(userPrompt);
      
      if (estimationResult.success) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: estimationResult.message,
          isEstimation: true,
          showPDFButtons: true,
          quotationData: estimationResult.quotationData
        }]);
        
        if (estimationResult.quotationData) {
          setQuotationFlow(prev => ({
            ...prev,
            data: estimationResult.quotationData,
            pendingGeneration: true,
            originalPrompt: userPrompt
          }));
        }
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: estimationResult.message,
          showPDFButtons: false
        }]);
      }
      return;
    }

    // Try hybrid parsing for regular quotations
    const aiResponse = await hybridParseQuotation(userPrompt);
    
    if (aiResponse && typeof aiResponse === 'object' && aiResponse.customerName && aiResponse.items) {
      const formattedData = convertToQuotationFormat(aiResponse);
      const validation = validateCriticalFields(formattedData);
      
      if (validation.canProceed) {
        const finalData = validation.updatedData;
        const summary = generateQuotationSummary(finalData);
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `📄 **Quotation Ready for ${finalData.customerName}**\n\n${summary}\n\n🔘 Ready to generate PDF?`,
          showPDFButtons: true,
          quotationData: finalData
        }]);
        
        setQuotationFlow(prev => ({
          ...prev,
          data: finalData,
          pendingGeneration: true,
          originalPrompt: userPrompt
        }));
        
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `🔎 I need some critical information to proceed: ${validation.missingCritical.join(", ")}\n\nPlease provide these essential details.`,
          showPDFButtons: false
        }]);
      }
    } else {
      // Start manual quotation flow
      setQuotationFlow(prev => ({ 
        ...prev, 
        askingAboutExistingCustomer: true,
        originalPrompt: userPrompt
      }));
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'I\'ll help you create a quotation! Would you like to create one for an existing customer? (Yes / No)',
        showPDFButtons: false
      }]);
    }
  };

  // 👤 EXISTING CUSTOMER RESPONSE HANDLER
  const handleExistingCustomerResponse = async (userPrompt) => {
    const intent = detectUserIntent(userPrompt);
    
    if (intent === 'affirmative') {
      const customers = await fetchExistingCustomers();
      if (customers.length > 0) {
        setQuotationFlow(prev => ({
          ...prev,
          askingAboutExistingCustomer: false,
          showingCustomerList: true,
          existingCustomers: customers
        }));
        
        const customerList = customers.map((customer, index) => `${index + 1}. ${customer.name}`).join('\n');
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `Great! Here are your saved customers:\n\n${customerList}\n\nPlease type the number:`,
          showPDFButtons: false
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'No saved customers found. Let\'s create a new quotation!\n\nWhat is the customer name?',
          showPDFButtons: false
        }]);
        setQuotationFlow(prev => ({ 
          ...prev, 
          askingAboutExistingCustomer: false,
          active: true,
          step: 0,
          structuredMode: true
        }));
      }
    } else {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Perfect! Let\'s create a new quotation.\n\nWhat is the customer name?',
        showPDFButtons: false
      }]);
      setQuotationFlow(prev => ({ 
        ...prev, 
        askingAboutExistingCustomer: false,
        active: true,
        step: 0,
        structuredMode: true
      }));
    }
  };

  // 🔘 PDF CONFIRMATION HANDLER  
  const handlePDFConfirmation = async (userPrompt) => {
    console.log('🔥 PDF Confirmation handler called with:', userPrompt);
    const intent = detectUserIntent(userPrompt);
    console.log('🔥 Detected intent:', intent);
    
    if (intent === 'affirmative') {
      console.log('✅ User confirmed PDF generation, proceeding...');
      
      // Immediately set pendingGeneration to false to prevent loops
      setQuotationFlow(prev => ({ ...prev, pendingGeneration: false }));
      
      if (quotationFlow.data.saveCustomer) {
        await saveCustomer(quotationFlow.data);
      }
      await generateQuotationPDF(quotationFlow.data);
      
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: '✅ **Quotation PDF generated successfully!**\n\nAnything else I can help you with?',
        showPDFButtons: false
      }]);
      
      // Reset quotation flow
      setQuotationFlow({
        active: false,
        step: 0,
        data: {
          customerName: '',
          saveCustomer: false,
          products: [],
          currentProduct: { description: '', qty: '', rate: '' },
          gst: 18,
          transport: 'Included',
          loadingCharges: 'Rs.250 per MT extra',
          paymentTerms: '',
          deliveryTerms: '',
          priceValidity: ''
        },
        pendingGeneration: false,
        originalPrompt: '',
        askingToSaveCustomer: false,
        askingAboutExistingCustomer: false,
        showingCustomerList: false,
        existingCustomers: [],
        validationResult: null,
        awaitingCompletion: false,
        awaitingValidationDecision: false,
        awaitingProductConfirmation: false,
        structuredMode: false,
        editMode: false,
        editingDraft: null
      });
      
    } else if (intent === 'negative') {
      console.log('❌ User declined PDF generation, entering edit mode...');
      
      // 🛠️ ACTIVATE EDIT MODE instead of just resetting
      console.log('🛠️ Activating edit mode with data:', quotationFlow.data);
      
      setQuotationFlow(prev => ({ 
        ...prev, 
        pendingGeneration: false,
        editMode: true,
        editingDraft: { ...prev.data } // Copy current data for editing
      }));
      
      const draftSummary = generateDraftSummary(quotationFlow.data);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: `🛠️ **Edit Mode Activated**\n\n${draftSummary}`,
        showPDFButtons: false,
        isEditMode: true
      }]);
      
      console.log('🛠️ Edit mode should now be active');
    } else {
      console.log('⚠️ Neutral response, re-prompting for confirmation');
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Please respond with "yes" to generate the PDF or "no" to edit the quotation.',
        showPDFButtons: false
      }]);
    }
  };

  // 🛠️ EDIT MODE HANDLER - Process natural language edit commands
  const handleEditMode = async (userPrompt) => {
    try {
      console.log('🛠️ Edit mode handler called with:', userPrompt);
      console.log('🛠️ Current editing draft:', quotationFlow.editingDraft);
      
      const editCommand = parseEditCommand(userPrompt);
      console.log('🛠️ Parsed edit command:', editCommand);
      
      if (editCommand.type === 'unknown') {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `❌ I didn't understand that edit command. Here are some examples:

**Customer Updates:**
• "Change customer name to ABC Corp"
• "Change name to Shafeel"
• "Set customer to Ramesh Traders"

**Add Products:**
• "Add item TMT 12mm - 5MT @ 58+GST"
• "Add item ISMB 150 - 3MT @ 65+GST"

**Update Terms:**
• "Update GST to 12%"

**Meta Commands:**
• "Show current draft"
• "Done" (to finalize)

Try one of these formats!`,
          showPDFButtons: false,
          isEditMode: true
        }]);
        return;
      }
      
      if (editCommand.type === 'meta') {
        switch (editCommand.action) {
          case 'show_draft':
            const currentDraft = generateDraftSummary(quotationFlow.editingDraft);
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: currentDraft,
              showPDFButtons: false,
              isEditMode: true
            }]);
            break;
            
          case 'reset':
            setQuotationFlow(prev => ({
              ...prev,
              editMode: false,
              editingDraft: null,
              pendingGeneration: false
            }));
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: '🔄 **Quotation reset!** You can start fresh or create a new quotation.',
              showPDFButtons: false
            }]);
            break;
            
          case 'finalize':
            // Exit edit mode and show final confirmation
            const finalSummary = generateQuotationSummary(quotationFlow.editingDraft);
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: `🎯 **Final Quotation Ready**\n\n${finalSummary}\n\n🔘 Ready to generate PDF?`,
              showPDFButtons: true,
              quotationData: quotationFlow.editingDraft
            }]);
            
            setQuotationFlow(prev => ({
              ...prev,
              editMode: false,
              data: prev.editingDraft, // Apply edited changes
              pendingGeneration: true
            }));
            break;
            
          default:
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: '❓ I didn\'t understand that command. Try:\n• "Show current draft"\n• "Done, generate PDF"\n• "Reset quotation"',
              showPDFButtons: false,
              isEditMode: true
            }]);
        }
      } else {
        // Apply the edit to the draft
        console.log('🛠️ Applying edit to quotation:', editCommand);
        const editResult = applyEditToQuotation(quotationFlow.editingDraft, editCommand);
        console.log('🛠️ Edit result:', editResult);
        
        setQuotationFlow(prev => ({
          ...prev,
          editingDraft: editResult.updatedData
        }));
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: `${editResult.confirmationMessage}\n\nWhat else would you like to edit? Or type "done" to finalize.`,
          showPDFButtons: false,
          isEditMode: true
        }]);
      }
      
    } catch (error) {
      console.error('❌ Error in edit mode:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: '❌ Sorry, I encountered an error processing your edit. Please try again or type "show current draft" to see the current state.',
        showPDFButtons: false,
        isEditMode: true
      }]);
    }
  };

  // 📊 QUOTATION SUMMARY GENERATOR
  const generateQuotationSummary = (quotationData) => {
    const totalAmount = quotationData.products.reduce((sum, item) => sum + item.amount, 0);
    const validGst = typeof quotationData.gst === 'number' && !isNaN(quotationData.gst) && quotationData.gst >= 0 ? quotationData.gst : 18;
    const gstAmount = totalAmount * (validGst / 100);
    const grandTotal = totalAmount + gstAmount;
    
    return `**Products:** ${quotationData.products.length} items
${quotationData.products.map(p => `• ${p.description}: ${p.qty}kg @ ₹${p.rate} = ₹${p.amount.toLocaleString()}`).join('\n')}

**Subtotal:** ₹${totalAmount.toLocaleString()}
**GST (${validGst}%):** ₹${gstAmount.toLocaleString()}  
**Grand Total:** ₹${grandTotal.toLocaleString()}`;
  };

  // 👥 CUSTOMER SELECTION HANDLER
  const handleCustomerSelection = async (userPrompt) => {
    const customerIndex = parseInt(userPrompt.trim()) - 1;
    if (customerIndex >= 0 && customerIndex < quotationFlow.existingCustomers.length) {
      const selectedCustomer = quotationFlow.existingCustomers[customerIndex];
      setQuotationFlow(prev => ({
        ...prev,
        showingCustomerList: false,
        active: true,
        step: 2,
        data: {
          ...prev.data,
          customerName: selectedCustomer.name,
          saveCustomer: false
        },
        structuredMode: true
      }));
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: `Perfect! Creating quotation for **${selectedCustomer.name}**.\n\nNow, let's add products. Please enter product description:`,
        showPDFButtons: false
      }]);
    } else {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Invalid selection. Please enter a valid customer number from the list above:',
        showPDFButtons: false
      }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-2rem)] flex flex-col">
      {/* Settings Menu */}
      <SettingsMenu onBusinessInfoUpdated={fetchBusinessInfo} />
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.isEditMode
                    ? 'bg-orange-50 text-gray-800 border border-orange-200'
                    : 'bg-gray-200 text-gray-800'
              }`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {message.text}
              
              {/* 🔘 CONTROLLED PDF BUTTONS - Only show when showPDFButtons is true */}
              {message.type === 'bot' && message.showPDFButtons && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        // Get the quotation data from the message or current flow state
                        const quotationData = message.quotationData || quotationFlow.data;
                        
                        if (quotationData && quotationData.customerName) {
                          // Save customer if needed
                          if (quotationData.saveCustomer) {
                            await saveCustomer(quotationData);
                          }
                          
                          // Generate PDF
                          await generateQuotationPDF(quotationData);
                          
                          // Add success message
                          setMessages(prev => [...prev, { 
                            type: 'bot', 
                            text: '✅ **Quotation PDF generated successfully!**\n\nAnything else I can help you with?',
                            showPDFButtons: false
                          }]);
                          
                          // Reset the askingToSaveCustomer state
                          setQuotationFlow(prev => ({
                            ...prev,
                            askingToSaveCustomer: false,
                            pendingGeneration: false,
                            data: {
                              customerName: '',
                              saveCustomer: false,
                              products: [],
                              currentProduct: { description: '', qty: '', rate: '' },
                              gst: 18,
                              transport: 'Included',
                              loadingCharges: 'Rs.250 per MT extra',
                              paymentTerms: '',
                              deliveryTerms: '',
                              priceValidity: ''
                            },
                            originalPrompt: '',
                            validationResult: null,
                            awaitingCompletion: false,
                            awaitingProductConfirmation: false,
                            structuredMode: false,
                            editMode: false,
                            editingDraft: null
                          }));
                        }
                      }} 
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      ✅ Yes, Generate PDF
                    </button>
                    <button 
                      onClick={() => {
                        // 🛠️ ACTIVATE EDIT MODE when user clicks "No, Edit"
                        console.log('🛠️ "No, Edit" button clicked');
                        console.log('🛠️ Current quotation data:', message.quotationData || quotationFlow.data);
                        
                        const quotationData = message.quotationData || quotationFlow.data;
                        const draftSummary = generateDraftSummary(quotationData);
                        
                        setMessages(prev => [...prev, { 
                          type: 'bot', 
                          text: `🛠️ **Edit Mode Activated**\n\n${draftSummary}`,
                          showPDFButtons: false,
                          isEditMode: true
                        }]);
                        
                        // Activate edit mode in quotation flow
                        setQuotationFlow(prev => {
                          const newState = { 
                            ...prev, 
                            pendingGeneration: false,
                            editMode: true,
                            editingDraft: { ...quotationData }
                          };
                          console.log('🛠️ Setting new quotation flow state:', newState);
                          return newState;
                        });
                      }} 
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      ✏️ No, Edit
                    </button>
                  </div>
                </div>
              )}
              
              {/* 🎯 SMART CUSTOMER SELECTION UI */}
              {message.type === 'bot' && message.showCustomerSelection && (
                <div className="mt-4 space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSelectionState.searchInput}
                      onChange={(e) => handleCustomerNameInput(e.target.value)}
                      placeholder="Type customer name to search..."
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    
                    {/* Real-time Suggestions Dropdown */}
                    {customerSelectionState.showSuggestions && customerSelectionState.suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 bg-gray-50 border-b text-sm text-gray-600 font-medium">
                          📝 Matching Customers ({customerSelectionState.suggestions.length})
                        </div>
                        {customerSelectionState.suggestions.map((customer, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectCustomer(customer.name)}
                            className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-gray-800">{customer.name}</div>
                              {customer.place && (
                                <div className="text-sm text-gray-500">{customer.place}</div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {customer.frequency || 1} quotes
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Frequently Billed Customers */}
                  {message.frequentCustomers && message.frequentCustomers.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-blue-600">⭐</span>
                        <span className="font-medium text-blue-800">Frequently Billed Customers</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {message.frequentCustomers.map((customer, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectCustomer(customer.name)}
                            className="text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-25 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{customer.name}</div>
                                {customer.place && (
                                  <div className="text-sm text-gray-500">{customer.place}</div>
                                )}
                              </div>
                              <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                {customer.frequency} quotes
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Manual Entry Button */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => {
                        if (customerSelectionState.searchInput.trim()) {
                          selectCustomer(customerSelectionState.searchInput.trim());
                        }
                      }}
                      disabled={!customerSelectionState.searchInput.trim()}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Use "{customerSelectionState.searchInput || 'customer name'}" as New Customer
                    </button>
                  </div>
                </div>
              )}
              
              {/* 🔄 QUOTATION CONTINUATION OPTIONS - When user goes off-topic */}
              {message.type === 'bot' && message.showQuotationOptions && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-600">⚠️</span>
                    <span className="font-medium text-amber-800">Quotation in Progress</span>
                  </div>
                  <div className="text-sm text-amber-700 mb-3">
                    Current step: <strong>{message.currentStep}</strong>
                    {message.contextData?.customerName && (
                      <span> • Customer: <strong>{message.contextData.customerName}</strong></span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setMessages(prev => [...prev, { 
                          type: 'user', 
                          text: 'Yes, continue' 
                        }]);
                        setMessages(prev => [...prev, { 
                          type: 'bot', 
                          text: getStepPromptMessage(message.currentStep)
                        }]);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      ✅ Yes, Continue
                    </button>
                    <button
                      onClick={() => {
                        setMessages(prev => [...prev, { 
                          type: 'user', 
                          text: 'No, start over' 
                        }]);
                        setQuotationFlow({
                          active: false,
                          step: 0,
                          data: {
                            customerName: '',
                            saveCustomer: false,
                            products: [],
                            currentProduct: { description: '', qty: '', rate: '' },
                            gst: 18,
                            transport: 'Included',
                            loadingCharges: 'Rs.250 per MT extra',
                            paymentTerms: '',
                            deliveryTerms: '',
                            priceValidity: ''
                          },
                          pendingGeneration: false,
                          originalPrompt: '',
                          askingToSaveCustomer: false,
                          askingAboutExistingCustomer: false,
                          showingCustomerList: false,
                          existingCustomers: [],
                          validationResult: null,
                          awaitingCompletion: false,
                          awaitingValidationDecision: false,
                          awaitingProductConfirmation: false,
                          structuredMode: false,
                          editMode: false,
                          editingDraft: null
                        });
                        setMessages(prev => [...prev, { 
                          type: 'bot', 
                          text: 'Quotation reset. What would you like to do next?'
                        }]);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      ❌ No, Start Over
                    </button>
                  </div>
                </div>
              )}
              
              {/* Legacy confirmation logic - keep for backward compatibility but this should rarely trigger now */}
              {message.type === 'bot' && showConfirmation && index === messages.length - 1 && !message.showPDFButtons && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 mb-3">Would you like me to generate a quotation PDF for this?</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowConfirmation(false);
                        handleSend();
                      }} 
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Yes, Generate PDF
                    </button>
                    <button 
                      onClick={() => setShowConfirmation(false)} 
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      No, Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-600 mb-2">💡 Quick suggestions based on your recent quotations:</p>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-2 text-sm bg-white hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors flex items-center gap-2"
              >
                <span className="text-blue-500">
                  {suggestion.type === 'customer' ? '👤' : '📦'}
                </span>
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {!quotationFlow.active && !customerSelectionState.active && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">⚡</span>
            <span className="font-medium text-gray-700">Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                setMessages(prev => [...prev, { type: 'user', text: 'create quotation' }]);
                await startSmartCustomerSelection();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              📄 New Quotation
            </button>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={
              customerSelectionState.active
                ? "Type customer name or select from suggestions above..."
                : quotationFlow.editMode 
                  ? "Edit your quotation... (Try: 'Add item: TMT 12mm - 5MT @ 58+GST' or 'Change customer name to ABC Corp')"
                  : quotationFlow.active 
                    ? "Enter your response..." 
                    : "Type your command here... (Try 'create quotation')"
            }
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`px-6 py-2 bg-blue-500 text-white rounded-lg transition-colors self-end ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}