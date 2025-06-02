import { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ChatBot() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const generatePDF = () => {
    // Placeholder data (replace with dynamic values as needed)
    const company = {
      name: 'IGNITE INDUSTRIAL CORPORATION',
      address: 'No.1A, 1st FLOOR, JONES STREET, MANNADY, CHENNAI - 600001',
      gstin: '33AAKFI5034N1Z6',
      email: 'igniteindustrialcorporation@gmail.com',
    };
    const documentNumber = 'SAMPLE_QUOTATION';
    const date = '25-05-2025';
    const customer = 'ABC INDUSTRIES, COIMBATORE';
    const items = [
      { description: 'MS FLAT 40x6mm', qty: 5000, rate: 52, amount: 260000 },
      { description: 'ISMC 100x50', qty: 3000, rate: 56, amount: 168000 },
    ];
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const taxableAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const gst = taxableAmount * 0.18;
    const grandTotal = taxableAmount + gst;
    const transport = 'Included';
    const loading = '₹250 per MT extra';
    const bank = {
      name: 'IGNITE INDUSTRIAL CORPORATION',
      acc: '194101300000000018',
      ifsc: 'KVBL0001941',
      branch: 'KVB Bank, BEEMANAGAR TRICHY',
    };

    const doc = new jsPDF();
    let y = 15;

    // Company Name
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

    // Document number and date (top-right)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Document #: ', 150, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(documentNumber, 180, 20, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text('Date: ', 150, 27);
    doc.setFont('helvetica', 'normal');
    doc.text(date, 180, 27, { align: 'right' });

    // To: Customer
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`To: ${customer}`, 14, y);
    y += 6;

    // Table
    const tableBody = items.map(item => [
      item.description,
      item.qty.toLocaleString() + ' kg',
      `₹${item.rate}`,
      `₹${item.amount.toLocaleString()}`
    ]);
    // Summary rows
    tableBody.push([
      { content: 'Total Quantity', colSpan: 1, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
      { content: `${totalQty.toLocaleString()} kg`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
    ]);
    tableBody.push([
      { content: 'Taxable Amount', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
      { content: `₹${taxableAmount.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
    ]);
    tableBody.push([
      { content: 'Add: GST (18%)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220,220,220] } },
      { content: `₹${gst.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [220,220,220] } }
    ]);
    tableBody.push([
      { content: 'Grand Total', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [180,180,180] } },
      { content: `₹${grandTotal.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [180,180,180] } }
    ]);

    autoTable(doc, {
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
        if (data.row.index >= items.length) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    // Transport and Loading Charges box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(14, y, 182, 24);
    doc.setFont('helvetica', 'bold');
    doc.text('Transport:', 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(transport, 40, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Loading Charges:', 18, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(loading, 55, y + 16);
    y += 32;

    // Bank Details box
    doc.rect(14, y, 182, 24);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(bank.name, 18, y + 14);
    doc.text(`Acc No: ${bank.acc}`, 18, y + 19);
    doc.text(`IFSC Code: ${bank.ifsc}`, 80, y + 19);
    doc.text(`Branch: ${bank.branch}`, 18, y + 24);

    doc.save('quotation_sample.pdf');
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
      
      const aiResponse = await sendToOpenAI(prompt);
      
      // Check if the response is about a quotation
      if (aiResponse.toLowerCase().includes('quotation')) {
        setShowConfirmation(true);
      }
      
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: aiResponse
      }]);
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