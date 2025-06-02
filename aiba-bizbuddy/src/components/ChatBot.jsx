import { useState, useEffect } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { useAuth } from '../context/AuthContext';
import { savePromptHistory } from '../utils/promptLogger';
import { parseQuotationPrompt } from '../utils/parseQuotationInput';
import { validateQuotationData, getValidationMessage, validateMinimumQuotationData } from '../utils/validateQuotationInput';

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
    awaitingValidationDecision: false // Track if waiting for user's decision on validation
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

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!currentUser) return;
      try {
        const ref = doc(db, 'users', currentUser.uid, 'business', 'info');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setBusinessInfo(snap.data());
        }
      } catch (err) {
        console.error('Error fetching business info:', err);
      }
    };
    fetchBusinessInfo();
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
      const customerRef = doc(db, 'users', currentUser.uid, 'customers', customerData.customerName);
      await setDoc(customerRef, {
        name: customerData.customerName,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        lastQuotationDate: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error saving customer:', error);
      return false;
    }
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
      "Create quotation for ABC Industries 5MT ISMC 100x50 @ Rs.56 3MT MS FLAT @ Rs.52 GST 18% transport included",
      "Quote for XYZ Corp 2000kg steel bars @ 55 loading charges Rs.250 immediate payment",
      "Quotation for Golden Granite 10MT TMT bars @ 58 delivery 3 days validity 7 days"
    ];
    
    console.log("🧪 Testing regex parser with sample inputs:");
    testInputs.forEach((input, index) => {
      console.log(`\n--- Test ${index + 1} ---`);
      console.log("Input:", input);
      const result = parseQuotationPrompt(input);
      console.log("Result:", result);
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

  const handleQuotationFlow = async (userInput) => {
    const currentStep = quotationSteps[quotationFlow.step];
    const newData = { ...quotationFlow.data };
    
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
          
          if (userInput.toLowerCase().includes('no')) {
            setQuotationFlow(prev => ({
              ...prev,
              step: prev.step + 1,
              data: newData
            }));
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Enter GST percentage (default 18%):' 
            }]);
          }
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
            originalPrompt: ''
          });
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Quotation PDF generated successfully!' 
          }]);
        } else {
          setQuotationFlow(prev => ({ ...prev, active: false, step: 0, originalPrompt: '' }));
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
      const documentNumber = `QUO_${Date.now()}`;
      const date = new Date().toLocaleDateString('en-IN');
      
      const totalQty = quotationData.products.reduce((sum, item) => sum + item.qty, 0);
      const taxableAmount = quotationData.products.reduce((sum, item) => sum + item.amount, 0);
      
      // Ensure GST is valid before doing calculations
      const validGst = typeof quotationData.gst === 'number' && !isNaN(quotationData.gst) && quotationData.gst >= 0 ? quotationData.gst : 18;
      const gst = taxableAmount * (validGst / 100);
      const grandTotal = taxableAmount + gst;

      // *** Initialize jsPDF document instance right after data fetching ***
      const pdfDoc = new jsPDF();
      let y = 15;

      // Company Name (Seller Details - as requested in blue area)
      pdfDoc.setFontSize(18);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(businessInfo.businessName, 14, y);
      y += 8;
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(businessInfo.address, 14, y);
      y += 6;
      pdfDoc.text(`GSTIN: ${businessInfo.gstin}`, 14, y);
      y += 6;
      pdfDoc.text(`Email: ${businessInfo.email}`, 14, y);

      // Document number and date (top-right)
      pdfDoc.setFontSize(11);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Document #: ', 150, 20);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(documentNumber, 180, 20, { align: 'right' });
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Date: ', 150, 27);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(date, 180, 27, { align: 'right' });

      // To: Customer
      y += 12;
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text(`To: ${quotationData.customerName}`, 14, y);
      y += 6;

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
        { content: `Rs.${gst.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
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
        styles: { cellPadding: 2 },
        didParseCell: function (data) {
          if (data.row.index >= quotationData.products.length) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      y = pdfDoc.lastAutoTable.finalY + 10;

      // Transport and Loading Charges box
      pdfDoc.setDrawColor(0);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.rect(14, y, 182, 24);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Transport:', 18, y + 8);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(quotationData.transport, 40, y + 8);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Loading Charges:', 18, y + 16);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(quotationData.loadingCharges, 55, y + 16);
      y += 32;

      // Bank Details box
      pdfDoc.rect(14, y, 182, 24);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Bank Details:', 18, y + 8);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(businessInfo.bankName, 18, y + 14);
      pdfDoc.text(`Acc No: ${businessInfo.bankAccount}`, 18, y + 19);
      pdfDoc.text(`IFSC Code: ${businessInfo.ifsc}`, 80, y + 19);
      pdfDoc.text(`Branch: ${businessInfo.bankName}`, 18, y + 24);

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

  const handleSend = async () => {
    if (!prompt.trim()) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'user', text: prompt }]);
      
      // Check if user is responding to existing customer question
      if (quotationFlow.askingAboutExistingCustomer) {
        if (prompt.toLowerCase().includes('yes')) {
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
              text: `Here are your existing customers:\n\n${customerList}\n\nPlease type the number of the customer you'd like to create a quotation for:` 
            }]);
          } else {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'You don\'t have any saved customers yet. Let\'s create a new quotation. What is the customer name?' 
            }]);
            setQuotationFlow(prev => ({ 
              ...prev, 
              askingAboutExistingCustomer: false,
              active: true,
              step: 0
            }));
          }
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Let\'s create a new quotation. What is the customer name?' 
          }]);
          setQuotationFlow(prev => ({ 
            ...prev, 
            askingAboutExistingCustomer: false,
            active: true,
            step: 0
          }));
        }
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is selecting from customer list
      if (quotationFlow.showingCustomerList) {
        const customerIndex = parseInt(prompt.trim()) - 1;
        if (customerIndex >= 0 && customerIndex < quotationFlow.existingCustomers.length) {
          const selectedCustomer = quotationFlow.existingCustomers[customerIndex];
          setQuotationFlow(prev => ({
            ...prev,
            showingCustomerList: false,
            active: true,
            step: 2, // Skip customer name and save customer steps
            data: {
              ...prev.data,
              customerName: selectedCustomer.name,
              saveCustomer: false // Already saved
            }
          }));
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `Great! Creating quotation for ${selectedCustomer.name}.\n\nNow, let's add products. Please enter product description:` 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Invalid selection. Please enter a valid customer number from the list above:' 
          }]);
        }
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is responding to save customer question
      if (quotationFlow.askingToSaveCustomer) {
        if (prompt.toLowerCase().includes('yes')) {
          const saved = await saveCustomer(quotationFlow.data);
          if (saved) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: `Great! I've saved ${quotationFlow.data.customerName} to your customer list for future use.` 
            }]);
          } else {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Sorry, there was an error saving the customer details. Please try again later.' 
            }]);
          }
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'No problem! The customer details were not saved.' 
          }]);
        }
        
        // Reset the flow for already saved customers
        setQuotationFlow(prev => ({
          ...prev,
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
          awaitingCompletion: false
        }));
        
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is responding to validation decision
      if (quotationFlow.awaitingValidationDecision) {
        if (prompt.toLowerCase().includes('skip') || prompt.toLowerCase().includes('defaults')) {
          // User wants to skip with defaults
          const { updatedData } = quotationFlow.validationResult;
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Proceeding with defaults for missing fields...' 
          }]);
          
          // Generate PDF with defaults
          await generateQuotationPDF(updatedData);
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Quotation PDF generated successfully!' 
          }]);
          
          // Ask about saving customer if new
          if (!quotationFlow.data.saveCustomer) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'Do you want me to save this customer\'s details for future use? (Yes / No)' 
            }]);
            
            setQuotationFlow(prev => ({
              ...prev,
              awaitingValidationDecision: false,
              askingToSaveCustomer: true
            }));
          } else {
            // Reset flow
            setQuotationFlow(prev => ({
              ...prev,
              awaitingValidationDecision: false,
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
              validationResult: null
            }));
          }
          
        } else if (prompt.toLowerCase().includes('provide') || prompt.toLowerCase().includes('add')) {
          // User wants to provide missing information
          const { missingRequired } = quotationFlow.validationResult;
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `Great! Please provide the missing information:

${missingRequired.join('\n')}

You can provide all the information in one message or one by one.` 
          }]);
          
          setQuotationFlow(prev => ({
            ...prev,
            awaitingValidationDecision: false,
            awaitingCompletion: true
          }));
          
        } else {
          // User provided unclear response
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Please respond with "provide" to add missing information or "skip" to use defaults.' 
          }]);
        }
        
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is responding to validation completion prompt
      if (quotationFlow.awaitingCompletion) {
        if (prompt.toLowerCase().includes('continue')) {
          // Continue with defaults for missing fields
          const validation = validateQuotationData(quotationFlow.data);
          
          // Calculate totals and show final summary
          const totalAmount = validation.updatedData.products.reduce((sum, item) => sum + item.amount, 0);
          const validGst = typeof validation.updatedData.gst === 'number' && !isNaN(validation.updatedData.gst) && validation.updatedData.gst >= 0 ? validation.updatedData.gst : 18;
          const gstAmount = totalAmount * (validGst / 100);
          const grandTotal = totalAmount + gstAmount;
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `✅ Proceeding with defaults for missing fields:

Customer: ${validation.updatedData.customerName}
Products: ${validation.updatedData.products.length} items
${validation.updatedData.products.map(p => `- ${p.description}: ${p.qty}kg @ Rs.${p.rate} = Rs.${p.amount.toLocaleString()}`).join('\n')}

Subtotal: Rs.${totalAmount.toLocaleString()}
GST (${validGst}%): Rs.${gstAmount.toLocaleString()}
Grand Total: Rs.${grandTotal.toLocaleString()}

Ready to generate PDF? (yes/no)` 
          }]);
          
          setQuotationFlow(prev => ({
            ...prev,
            data: validation.updatedData,
            pendingGeneration: true,
            awaitingCompletion: false
          }));
          
        } else if (prompt.toLowerCase().includes('start over')) {
          // Reset and start over
          setQuotationFlow(prev => ({
            ...prev,
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
            awaitingCompletion: false,
            validationResult: null,
            originalPrompt: ''
          }));
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Starting over! Please provide your quotation request again.' 
          }]);
          
        } else {
          // User is providing missing information - try to parse and update
          try {
            const additionalData = parseQuotationPrompt(prompt);
            const updatedData = { ...quotationFlow.data };
            
            // Merge additional data
            if (additionalData.customerName && !updatedData.customerName) {
              updatedData.customerName = additionalData.customerName;
            }
            if (additionalData.items && additionalData.items.length > 0) {
              updatedData.products = [...(updatedData.products || []), ...additionalData.items.map(item => ({
                description: item.description,
                qty: item.quantity,
                rate: item.rate,
                amount: item.quantity * item.rate
              }))];
            }
            if (additionalData.transport) updatedData.transport = additionalData.transport;
            if (additionalData.loadingCharges) updatedData.loadingCharges = additionalData.loadingCharges;
            if (additionalData.paymentTerms) updatedData.paymentTerms = additionalData.paymentTerms;
            
            // Re-validate
            const newValidation = validateQuotationData(updatedData);
            
            if (newValidation.isComplete) {
              const validationMessage = getValidationMessage(newValidation);
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: `Great! I've updated the quotation with your additional information.

${validationMessage}` 
              }]);
              
              setQuotationFlow(prev => ({
                ...prev,
                data: newValidation.updatedData,
                pendingGeneration: true,
                awaitingCompletion: false
              }));
            } else {
              const validationMessage = getValidationMessage(newValidation);
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: `Updated! But still missing some information:

${validationMessage}

Continue providing missing info, type "continue" to proceed with defaults, or "start over".` 
              }]);
              
              setQuotationFlow(prev => ({
                ...prev,
                data: newValidation.updatedData,
                validationResult: newValidation,
                awaitingCompletion: true
              }));
            }
          } catch (error) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: 'I couldn\'t understand that additional information. Please try again, type "continue" to proceed with defaults, or "start over".' 
            }]);
          }
        }
        
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is confirming PDF generation
      if (quotationFlow.pendingGeneration && (prompt.toLowerCase().includes('yes') || prompt.toLowerCase().includes('generate'))) {
        // Validate data before PDF generation
        const { isComplete, missingRequired, updatedData } = validateQuotationData(quotationFlow.data);
        
        if (!isComplete) {
          const missingList = missingRequired.join(", ");
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `⚠️ I'm almost ready to generate your PDF. Can you please confirm the following before I proceed?

Missing Required: ${missingList}

Would you like to:
📝 Provide the missing information
⏭️ Skip & Use Defaults

Type "provide" to add missing info or "skip" to use defaults.` 
          }]);
          
          // Set state to await user's decision
          setQuotationFlow(prev => ({
            ...prev,
            awaitingValidationDecision: true,
            validationResult: { isComplete, missingRequired, updatedData }
          }));
          
          setPrompt('');
          setIsLoading(false);
          return;
        }
        
        // All required data exists, generate PDF
        await generateQuotationPDF(updatedData);
        
        // After PDF generation is complete, show success message
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Quotation PDF generated successfully!' 
        }]);
        
        // Only ask to save customer if it's a new customer (not already saved)
        if (!quotationFlow.data.saveCustomer) {
          // Ask about saving customer after PDF is complete
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Do you want me to save this customer\'s details for future use? (Yes / No)' 
          }]);
          
          // Set state to ask about saving customer
          setQuotationFlow(prev => ({
            ...prev,
            pendingGeneration: false,
            askingToSaveCustomer: true
          }));
        } else {
          // Reset the flow for already saved customers
          setQuotationFlow(prev => ({
            ...prev,
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
            originalPrompt: ''
          }));
        }
        
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user is declining PDF generation
      if (quotationFlow.pendingGeneration && (prompt.toLowerCase().includes('no') || prompt.toLowerCase().includes('cancel'))) {
        setQuotationFlow(prev => ({ 
          ...prev, 
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
          }
        }));
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Quotation generation cancelled. Feel free to ask for any modifications or create a new quotation.' 
        }]);
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Check if user wants to create a quotation (manual flow)
      if (prompt.toLowerCase().includes('create quotation') && !quotationFlow.active && !prompt.toLowerCase().includes('for ')) {
        setQuotationFlow(prev => ({ 
          ...prev, 
          askingAboutExistingCustomer: true,
          originalPrompt: prompt
        }));
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Would you like to create a quotation for an existing customer? (Yes / No)' 
        }]);
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      // Handle quotation flow
      if (quotationFlow.active) {
        await handleQuotationFlow(prompt);
        setPrompt('');
        setIsLoading(false);
        return;
      }
      
      const aiResponse = await hybridParseQuotation(prompt);
      
      // Check if the response is parsed quotation data (object) or raw text (string)
      if (aiResponse && typeof aiResponse === 'object' && aiResponse.customerName && aiResponse.items) {
        // Convert extracted data to our format
        const formattedData = convertToQuotationFormat(aiResponse);
        
        // Validate the quotation data
        const validation = validateQuotationData(formattedData);
        console.log("🔍 Validation result:", validation);
        
        if (validation.isComplete) {
          // Calculate totals for display with GST validation
          const totalAmount = validation.updatedData.products.reduce((sum, item) => sum + item.amount, 0);
          const validGst = typeof validation.updatedData.gst === 'number' && !isNaN(validation.updatedData.gst) && validation.updatedData.gst >= 0 ? validation.updatedData.gst : 18;
          const gstAmount = totalAmount * (validGst / 100);
          const grandTotal = totalAmount + gstAmount;
          
          const validationMessage = getValidationMessage(validation);
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `I've extracted the following quotation details:

Customer: ${validation.updatedData.customerName}
Products: ${validation.updatedData.products.length} items
${validation.updatedData.products.map(p => `- ${p.description}: ${p.qty}kg @ Rs.${p.rate} = Rs.${p.amount.toLocaleString()}`).join('\n')}

Subtotal: Rs.${totalAmount.toLocaleString()}
GST (${validGst}%): Rs.${gstAmount.toLocaleString()}
Grand Total: Rs.${grandTotal.toLocaleString()}

${validationMessage}` 
          }]);
          
          // Store the validated data for potential PDF generation
          setQuotationFlow(prev => ({
            ...prev,
            data: validation.updatedData,
            pendingGeneration: true,
            originalPrompt: prompt
          }));
          
        } else {
          // Data is incomplete, ask for missing information
          const validationMessage = getValidationMessage(validation);
          
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `I've partially extracted quotation details:

${validation.updatedData.customerName ? `Customer: ${validation.updatedData.customerName}` : ''}
${validation.updatedData.products?.length > 0 ? `Products: ${validation.updatedData.products.length} items` : ''}

${validationMessage}

Would you like to:
1. Continue with missing information (I'll use defaults)
2. Provide the missing details
3. Start over

Type "continue", provide missing info, or "start over".` 
          }]);
          
          // Store the partial data for potential completion
          setQuotationFlow(prev => ({
            ...prev,
            data: validation.updatedData,
            pendingGeneration: false,
            originalPrompt: prompt,
            validationResult: validation,
            awaitingCompletion: true
          }));
        }
        
      } else {
        // If parsing failed, try regular AI response
        console.log("🔄 Falling back to regular AI response...");
        const regularAiResponse = await sendToOpenAI(prompt);
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: regularAiResponse
        }]);
        
        // Check if the response suggests quotation generation
        if (typeof regularAiResponse === 'string' && regularAiResponse.toLowerCase().includes('quotation')) {
          setShowConfirmation(true);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-2rem)] flex flex-col">
      {/* DEBUG: Remove this in production */}
      <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
        <button 
          onClick={createTestData}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm mr-2"
        >
          Create Test Data
        </button>
        <button 
          onClick={testRegexParser}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm mr-2"
        >
          Test Regex Parser
        </button>
        <button 
          onClick={testValidationFlow}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm mr-2"
        >
          Test Validation Flow
        </button>
        <span className="text-xs text-yellow-700">Debug: Create test data, then try typing "quote" or test the regex parser</span>
      </div>
      
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
                  : 'bg-gray-200 text-gray-800'
              }`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {message.text}
              {message.type === 'bot' && showConfirmation && index === messages.length - 1 && (
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

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={quotationFlow.active ? "Enter your response..." : "Type your command here... (Try 'create quotation')"}
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