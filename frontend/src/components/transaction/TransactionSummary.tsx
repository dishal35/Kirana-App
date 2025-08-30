import React from 'react';

export interface TransactionSummaryProps {
  originalAmount: number;
  calculatedTotal: number;
  amountDifference: number;
  selectedProductsCount: number;
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  originalAmount,
  calculatedTotal,
  amountDifference,
  selectedProductsCount
}) => {
  const getDifferenceColor = () => {
    if (Math.abs(amountDifference) < 0.01) return 'text-green-600';
    if (amountDifference > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDifferenceIcon = () => {
    if (Math.abs(amountDifference) < 0.01) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    if (amountDifference > 0) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  const getDifferenceMessage = () => {
    if (Math.abs(amountDifference) < 0.01) {
      return 'Perfect match!';
    }
    if (amountDifference > 0) {
      return `₹${amountDifference.toFixed(2)} more than received`;
    }
    return `₹${Math.abs(amountDifference).toFixed(2)} less than received`;
  };

  const getAccuracyPercentage = () => {
    if (originalAmount === 0) return 100;
    const accuracy = Math.max(0, 100 - (Math.abs(amountDifference) / originalAmount) * 100);
    return Math.round(accuracy);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Transaction Summary</h3>
      
      {/* Amount Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Amount Received:</span>
          <span className="font-medium">₹{originalAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Selected Products Total:</span>
          <span className="font-medium">₹{calculatedTotal.toFixed(2)}</span>
        </div>
        
        <hr className="border-gray-200" />
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Difference:</span>
          <div className="flex items-center gap-2">
            {getDifferenceIcon()}
            <span className={`font-medium ${getDifferenceColor()}`}>
              {getDifferenceMessage()}
            </span>
          </div>
        </div>
      </div>

      {/* Accuracy Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Match Accuracy:</span>
          <span className="font-medium">{getAccuracyPercentage()}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              getAccuracyPercentage() >= 95 ? 'bg-green-500' :
              getAccuracyPercentage() >= 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${getAccuracyPercentage()}%` }}
          />
        </div>
      </div>

      {/* Additional Info */}
      {selectedProductsCount > 0 && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {selectedProductsCount} product{selectedProductsCount !== 1 ? 's' : ''} selected</p>
          
          {Math.abs(amountDifference) > 0.01 && (
            <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <p className="text-yellow-800">
                <strong>Note:</strong> The selected products total doesn't exactly match the received amount. 
                {amountDifference > 0 
                  ? ' You may need to collect additional payment or adjust quantities.'
                  : ' You may need to provide change to the customer.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {selectedProductsCount === 0 && (
        <div className="text-sm text-gray-500 italic text-center py-2">
          Select products to see transaction details
        </div>
      )}
    </div>
  );
};