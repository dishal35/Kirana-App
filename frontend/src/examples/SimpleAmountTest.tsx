import React, { useState } from 'react';

const SimpleAmountTest: React.FC = () => {
  const [inputText, setInputText] = useState('You received Rs. 25 on PhonePe');
  const [result, setResult] = useState<string>('');

  const testExtraction = () => {
    try {
      // Simple regex test without importing the full service
      const patterns = [
        /(?:received|credited|got|payment of)\s*(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
        /(?:rs\.?|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
      ];

      for (const pattern of patterns) {
        const match = inputText.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          setResult(`Found amount: ₹${amount} using pattern: ${pattern.source}`);
          return;
        }
      }
      
      setResult('No amount found');
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  const sampleTexts = [
    'You received Rs. 25 on PhonePe',
    'Payment of ₹1,500 received via GPay',
    'Paytm: Rs. 75.50 credited',
    'आपको ₹500 मिले हैं',
    'No amount here'
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold mb-4">Simple Amount Extraction Test</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Text:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <button
          onClick={testExtraction}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Extraction
        </button>

        <div className="p-3 bg-gray-100 rounded">
          <strong>Result:</strong> {result || 'Click "Test Extraction" to see results'}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Sample Texts:</h3>
          {sampleTexts.map((text, index) => (
            <button
              key={index}
              onClick={() => setInputText(text)}
              className="block w-full text-left p-2 mb-1 bg-gray-50 hover:bg-gray-100 rounded text-sm"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleAmountTest;