import React, { useState } from 'react';
import { parseUnstructuredQuotation } from '../utils/unstructuredQuotationParser.js';
import { formatQuotationWithUOM, generateQuotationDisplayText } from '../utils/quotationFormatter.js';

function QuotationParserTest() {
  const [prompt, setPrompt] = useState('Create quote to SRI ENERGY , VIRALIMALAI. UOM to be in Mtrs. Transport Included Loading Charges included. MS Channel 75 x40 x6mm - 6 MTR Length, 140 Nos. MS Flat 75 x 10mm - 6 MTR, 10 Nos. MS Angle 40x40x6mm - 6 MTR, 35 Nos. MS Flat 50 x 06 mm - 6 MTR, 300 Nos. Add 18% GST');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testParser = () => {
    try {
      setError(null);
      const parsed = parseUnstructuredQuotation(prompt);
      console.log('Parsed result:', parsed);
      setResult(parsed);
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Quotation Parser Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Test Prompt:
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg h-32"
          placeholder="Enter your quotation prompt here..."
        />
      </div>

      <button
        onClick={testParser}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        🔍 Test Parser
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>✅ Parser Success!</strong>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">📊 Extracted Data:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Customer:</strong> {result.customer}</div>
              <div><strong>Location:</strong> {result.location}</div>
              <div><strong>UOM:</strong> {result.uom}</div>
              <div><strong>Transport:</strong> {result.transport}</div>
              <div><strong>Loading:</strong> {result.loadingCharges}</div>
              <div><strong>GST:</strong> {result.gst}%</div>
            </div>
          </div>

          {result.items && result.items.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📦 Items ({result.items.length}):</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Length</th>
                      <th className="text-left p-2">Nos</th>
                      {result.uom === 'Metres' ? (
                        <>
                          <th className="text-left p-2">Total Mtrs</th>
                          <th className="text-left p-2">Rate/mtr</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left p-2">Total kg</th>
                          <th className="text-left p-2">Rate/kg</th>
                        </>
                      )}
                      <th className="text-left p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2">{item.length}m</td>
                        <td className="p-2">{item.nos}</td>
                        <td className="p-2">{result.uom === 'Metres' ? item.total_mtrs : item.total_kg?.toFixed(2)}</td>
                        <td className="p-2">₹{result.uom === 'Metres' ? item.rate_per_mtr : item.rate_per_kg}</td>
                        <td className="p-2">₹{item.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">💰 Totals:</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Subtotal:</strong> ₹{result.subtotal.toLocaleString('en-IN')}</div>
              <div><strong>GST ({result.gst}%):</strong> ₹{(result.total - result.subtotal).toLocaleString('en-IN')}</div>
              <div className="text-lg"><strong>Grand Total:</strong> ₹{result.total.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <details className="bg-gray-100 p-4 rounded-lg">
            <summary className="font-semibold cursor-pointer">🔍 Raw JSON Output</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default QuotationParserTest; 