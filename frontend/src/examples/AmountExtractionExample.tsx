import React, { useState, useEffect } from 'react';
import { AmountExtractor } from '../services/AmountExtractor';
import type { AmountExtractionResult } from '../services/AmountExtractor';
import type { Product } from '../types';

const AmountExtractionExample: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [extractionResult, setExtractionResult] = useState<AmountExtractionResult | null>(null);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [extractor] = useState(() => new AmountExtractor());

  // Sample inventory for testing product suggestions
  const sampleInventory: Product[] = [
    {
      id: '1',
      name: 'Milk (500ml)',
      price: 25,
      stock: 10,
      reorderThreshold: 5,
      category: 'Dairy',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Bread',
      price: 30,
      stock: 8,
      reorderThreshold: 3,
      category: 'Bakery',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Rice (1kg)',
      price: 50,
      stock: 15,
      reorderThreshold: 5,
      category: 'Grains',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      name: 'Tea Powder (250g)',
      price: 75,
      stock: 12,
      reorderThreshold: 4,
      category: 'Beverages',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      name: 'Sugar (1kg)',
      price: 45,
      stock: 20,
      reorderThreshold: 8,
      category: 'Groceries',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Sample UPI alert texts for testing
  const sampleTexts = [
    "You have received ₹25.00 from John Doe on PhonePe",
    "Google Pay: ₹1,500 received from Jane Smith. Transaction ID: GP123456789",
    "Paytm Notification: Rs. 75.50 credited to your account from Bob Wilson",
    "UPI Alert: Amount Rs. 2,000 received via PhonePe from Alice Johnson",
    "Payment Alert: ₹999 received through Google Pay from Mike Davis",
    "फोनपे अलर्ट: आपको ₹500 मिले हैं राम शर्मा से",
    "गूगल पे: रुपये 1,200 प्राप्त हुए श्याम वर्मा से",
    "ನಿಮಗೆ ₹180 ಫೋನ್‌ಪೇ ನಲ್ಲಿ ಸಿಕ್ಕಿತು",
    "ರೂಪಾಯಿ 800 ಗೂಗಲ್ ಪೇ ನಲ್ಲಿ ಬಂದಿದೆ",
    "₹50 received",
    "Payment of Rs. 100 completed"
  ];

  useEffect(() => {
    if (inputText.trim()) {
      // Extract amount using AmountExtractor
      const result = extractor.extractAmount(inputText);
      setExtractionResult(result);
    } else {
      setExtractionResult(null);
    }
  }, [inputText, minConfidence, extractor]);

  const handleSampleTextClick = (text: string) => {
    setInputText(text);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    if (confidence >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'phonepe': return '📱';
      case 'gpay': return '🔍';
      case 'paytm': return '💳';
      case 'generic': return '💰';
      default: return '❓';
    }
  };

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case 'en': return '🇬🇧';
      case 'hi': return '🇮🇳';
      case 'kn': return '🏴';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        🔍 UPI Amount Extraction Demo
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter UPI Alert Text:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your UPI alert message here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Confidence: {minConfidence}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sample Texts:</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sampleTexts.map((text, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleTextClick(text)}
                  className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Amount Extraction Results */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              💰 Amount Extraction Results
            </h3>
            
            {extractionResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    {extractionResult.amount ? `₹${extractionResult.amount}` : 'Not found'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Confidence:</span>
                  <span className={`font-semibold ${getConfidenceColor(extractionResult.confidence)}`}>
                    {(extractionResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Platform:</span>
                  <span className="flex items-center gap-1">
                    {getPlatformIcon(extractionResult.platform)}
                    {extractionResult.platform}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Language:</span>
                  <span className="flex items-center gap-1">
                    {getLanguageFlag(extractionResult.language)}
                    {extractionResult.language}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Extracted Text:</span>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded">
                    {extractionResult.extractedText || 'N/A'}
                  </span>
                </div>

                <div className="mt-3 p-2 rounded border-l-4 border-blue-500 bg-blue-50">
                  <span className="text-sm font-medium">
                    Validation: {extractor.validateExtraction(extractionResult, minConfidence) ? 
                      '✅ Passed' : '❌ Failed (below confidence threshold)'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Enter text to see extraction results</p>
            )}
          </div>

          {/* Validation Results */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              ✅ Validation Results
            </h3>
            
            {extractionResult ? (
              <div className="space-y-3">
                {extractionResult.amount !== null ? (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-600 mb-2">
                      {extractor.validateExtraction(extractionResult, minConfidence) ? 
                        '✅ Extraction Valid' : '❌ Below Confidence Threshold'}
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>Amount: <span className="font-bold">₹{extractionResult.amount}</span></div>
                      <div>Confidence: <span className="font-medium">{(extractionResult.confidence * 100).toFixed(1)}%</span></div>
                      <div>Required: <span className="font-medium">{(minConfidence * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded border border-red-200">
                    <h4 className="font-semibold text-red-600 mb-2">❌ No Amount Found</h4>
                    <p className="text-sm text-red-600">
                      Could not extract any amount from the provided text.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">Enter UPI alert text to see validation results</p>
            )}
          </div>

          {/* Pattern Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              🔍 Pattern Information
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>Platforms:</strong> PhonePe, GPay, Paytm, Generic UPI</div>
              <div><strong>Languages:</strong> English, Hindi (हिंदी), Kannada (ಕನ್ನಡ)</div>
              <div><strong>Formats:</strong> ₹, Rs., rupees, रुपये, ರೂಪಾಯಿ</div>
              <div><strong>Amount Range:</strong> ₹1 - ₹1,00,00,000</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {inputText && (
        <div className="mt-6 bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            📊 Extraction Statistics
          </h3>
          <div className="text-sm">
            <p><strong>Supported Platforms:</strong> {extractor.getSupportedPlatforms().join(', ')}</p>
            <p><strong>Supported Languages:</strong> {extractor.getSupportedLanguages().join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmountExtractionExample;