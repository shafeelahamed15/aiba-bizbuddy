import { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { parsePrompt, parsePromptWithFallback, validateParsedData, formatParsedData } from '../utils/parsePrompt.js';
import { calculateWeight, getWeightInfo, isValidItem, findSimilarItems } from '../utils/calculateWeight.js';

export default function ChatBot({ businessInfo }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [quotationData, setQuotationData] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const generatePDF = () => {
    // Use business info from props or quotation data
    const company = {
      name: businessInfo.businessName,
      address: businessInfo.address,
      gstin: businessInfo.gstin,
      email: businessInfo.email,
    };
    
    // Generate proper document number with timestamp
    const timestamp = new Date().getTime().toString().slice(-6);
    const documentNumber = `QUOT${timestamp}`;
    const date = new Date().toLocaleDateString('en-IN');
    
    // Use quotation data if available, otherwise use sample data
    const customer = quotationData?.customerName || 'ABC INDUSTRIES, COIMBATORE';
    const products = quotationData?.products || quotationData?.items || [
      { description: 'MS FLAT 40x6mm', qty: 5000, rate: 52, amount: 260000 },
      { description: 'ISMC 100x50', qty: 3000, rate: 56, amount: 168000 },
    ];
    
    const totalQty = products.reduce((sum, item) => sum + parseFloat(item.qty || 0), 0);
    const taxableAmount = products.reduce((sum, item) => sum + (item.amount || 0), 0);
    const gst = taxableAmount * 0.18;
    const grandTotal = taxableAmount + gst;
    const transport = 'Included';
    const loading = '₹250 per MT extra';
    const bank = {
      name: businessInfo.businessName,
      acc: businessInfo.bankAccount,
      ifsc: businessInfo.ifsc,
      branch: businessInfo.bankName,
    };

    const doc = new jsPDF();
    let y = 15;

    // Company Header - Left side
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(company.address, 14, y);
    y += 6;
    doc.text(`GSTIN: ${company.gstin}`, 14, y);
    y += 6;
    doc.text(`Email: ${company.email}`, 14, y);

    // Document number and date - Right side with proper spacing
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    // Document Number
    const docNumX = 120;
    const docNumValueX = 170;
    doc.text('Document #:', docNumX, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(documentNumber, docNumValueX, 20);
    
    // Date - positioned below document number with proper spacing
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', docNumX, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(date, docNumValueX, 30);

    // Add a line separator
    doc.setLineWidth(0.5);
    doc.line(14, 45, 196, 45);

    // To: Customer - with proper spacing after header
    y = 55;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`To: ${customer}`, 14, y);
    y += 10;

    // Items table
    doc.autoTable({
      startY: y,
      head: [['Description', 'Qty (kg)', 'Rate (₹)', 'Amount (₹)']],
      body: products.map(item => [
        item.description,
        parseFloat(item.qty || 0).toFixed(2),
        parseFloat(item.rate || 0).toFixed(2),
        formatCurrency(item.amount || 0).replace('₹', '')
      ]),
      foot: [
        ['', '', 'Subtotal:', formatCurrency(taxableAmount).replace('₹', '')],
        ['', '', 'GST (18%):', formatCurrency(gst).replace('₹', '')],
        ['', '', 'Grand Total:', formatCurrency(grandTotal).replace('₹', '')]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontSize: 11,
        halign: 'center'
      },
      footStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Transport and Loading Charges box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 249, 250);
    doc.rect(14, y, 182, 28, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Additional Information:', 18, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Transport: ${transport}`, 18, y + 16);
    doc.text(`Loading Charges: ${loading}`, 18, y + 22);
    
    y += 35;

    // Bank Details box
    doc.setFillColor(248, 249, 250);
    doc.rect(14, y, 182, 35, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Bank Details:', 18, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Account Name: ${bank.name}`, 18, y + 16);
    doc.text(`Account Number: ${bank.acc}`, 18, y + 22);
    doc.text(`IFSC Code: ${bank.ifsc}`, 18, y + 28);
    doc.text(`Branch: ${bank.branch}`, 100, y + 28);

    // Footer
    y += 45;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('This is a system generated quotation.', 14, y);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, y + 6);

    doc.save(`quotation_${documentNumber}.pdf`);
  };

  const QuotationTable = ({ data }) => {
    const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;

    return (
      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">Quotation for {data.customerName}</h3>
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Description</th>
              <th className="border p-2">Qty (kg)</th>
              <th className="border p-2">Rate</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2">{item.qty}</td>
                <td className="border p-2">{formatCurrency(item.rate)}</td>
                <td className="border p-2">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="border p-2 text-right font-semibold">Subtotal:</td>
              <td className="border p-2">{formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan="3" className="border p-2 text-right font-semibold">GST (18%):</td>
              <td className="border p-2">{formatCurrency(gst)}</td>
            </tr>
            <tr>
              <td colSpan="3" className="border p-2 text-right font-semibold">Grand Total:</td>
              <td className="border p-2 font-bold">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        {showConfirmation && (
          <div className="mt-4">
            <p>Would you like me to generate a quotation PDF for this?</p>
            <button 
              onClick={generatePDF} 
              className="bg-green-500 text-white px-3 py-1 mt-2 rounded hover:bg-green-600"
            >
              Yes
            </button>
            <button 
              onClick={() => setShowConfirmation(false)} 
              className="ml-2 text-sm text-gray-600 hover:text-gray-800"
            >
              No, Edit
            </button>
          </div>
        )}
      </div>
    );
  };

  const QuotationConfirmation = () => (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <p className="text-gray-700 mb-3">Would you like me to generate a quotation PDF for this?</p>
      <div className="flex gap-3">
        <button 
          onClick={generatePDF} 
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
  );

  const handleSteelEstimation = async (userPrompt) => {
    try {
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
        const { description, quantity, rate } = item;
        
        // Check if item exists in our database
        if (!isValidItem(description)) {
          // Try to find similar items
          const similarItems = findSimilarItems(description);
          if (similarItems.length > 0) {
            estimationResults.warnings.push(
              `"${description}" not found. Did you mean: ${similarItems.slice(0, 3).join(', ')}?`
            );
          } else {
            estimationResults.warnings.push(
              `"${description}" not found in our database. Using manual calculation.`
            );
          }
          
          // Use manual calculation for unknown items
          estimationResults.items.push({
            description,
            quantity,
            rate: rate || 0,
            weight: 0,
            weightPerUnit: 0,
            totalWeight: 0,
            value: quantity * (rate || 0),
            status: 'unknown_item',
            matchScore: item.matchScore
          });
          
          estimationResults.totalValue += quantity * (rate || 0);
          return;
        }

        // Calculate weight using our utility
        const totalWeight = calculateWeight(description, quantity, 6); // 6m default length
        const weightInfo = getWeightInfo(description, 6);
        const value = quantity * (rate || 0);
        
        estimationResults.items.push({
          description,
          quantity,
          rate: rate || 0,
          weight: totalWeight,
          weightPerUnit: weightInfo.weightPerUnit || weightInfo.weightPerMeter || 0,
          totalWeight,
          value,
          status: 'found',
          weightInfo,
          matchScore: item.matchScore
        });

        estimationResults.totalWeight += totalWeight;
        estimationResults.totalValue += value;
      });

      // Calculate GST
      estimationResults.gstAmount = estimationResults.totalValue * (estimationResults.gst / 100);
      estimationResults.grandTotal = estimationResults.totalValue + estimationResults.gstAmount;

      // Add validation warnings
      if (validation.warnings.length > 0) {
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
        
        if (item.status === 'found') {
          responseMessage += `   - Weight per unit: ${item.weightPerUnit.toFixed(2)} kg\n`;
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

      // Store quotation data for PDF generation
      setQuotationData({
        customerName: estimationResults.customer,
        items: estimationResults.items.map(item => ({
          description: item.description,
          qty: item.totalWeight > 0 ? item.totalWeight.toFixed(2) : item.quantity,
          rate: item.rate,
          amount: item.value
        }))
      });

      return {
        success: true,
        message: responseMessage,
        showQuotation: true,
        data: estimationResults
      };

    } catch (error) {
      return {
        success: false,
        message: `Error processing steel estimation: ${error.message}`
      };
    }
  };

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

  const sendToOpenAI = async (userMessage) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: userMessage
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'user', text: prompt }]);
      
      // Check if this is a steel estimation request
      if (detectSteelEstimationRequest(prompt)) {
        console.log('Detected steel estimation request, processing...');
        const estimationResult = await handleSteelEstimation(prompt);
        
        if (estimationResult.success) {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: estimationResult.message,
            isEstimation: true
          }]);
          
          if (estimationResult.showQuotation) {
            setShowConfirmation(true);
          }
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: estimationResult.message
          }]);
        }
      } else {
        // Regular AI chat
        const aiResponse = await sendToOpenAI(prompt);
        
        // Check if the response is about a quotation
        if (aiResponse.toLowerCase().includes('quotation')) {
          setShowConfirmation(true);
        }
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: aiResponse
        }]);
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
            >
              {message.text}
              {message.type === 'bot' && showConfirmation && index === messages.length - 1 && (
                <QuotationConfirmation />
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

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your command here..."
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