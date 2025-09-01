import React, { useState, useEffect } from 'react';
import { ChatInterface } from './ChatInterface';
import { productRepository, transactionRepository } from '../../dbs/repo';
import type { BusinessContext } from '../../types';

export const ChatPage: React.FC = () => {
  const [businessContext, setBusinessContext] = useState<BusinessContext>({
    todaysSales: [],
    inventory: [],
    salesHistory: []
  });
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load business context on component mount
  useEffect(() => {
    loadBusinessContext();
  }, []);

  const loadBusinessContext = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load inventory
      const inventory = await productRepository.getAll();
      
      // Load today's sales
      const todaysSales = await transactionRepository.getTodaysTransactions();
      
      // Load sales history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const salesHistory = await transactionRepository.getTransactionsByDateRange(
        thirtyDaysAgo,
        new Date()
      );

      setBusinessContext({
        todaysSales,
        inventory,
        salesHistory
      });
    } catch (error) {
      console.error('Failed to load business context:', error);
      setError('Failed to load business data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (newLanguage: 'en' | 'hi' | 'kn') => {
    setLanguage(newLanguage);
  };

  const getPageTitle = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'व्यापार सहायक';
      case 'kn':
        return 'ವ್ಯಾಪಾರ ಸಹಾಯಕ';
      default:
        return 'Business Assistant';
    }
  };

  const getLoadingText = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'व्यापार डेटा लोड हो रहा है...';
      case 'kn':
        return 'ವ್ಯಾಪಾರ ಡೇಟಾ ಲೋಡ್ ಆಗುತ್ತಿದೆ...';
      default:
        return 'Loading business data...';
    }
  };

  const getErrorText = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'व्यापार डेटा लोड करने में त्रुटि। कृपया पेज रिफ्रेश करें।';
      case 'kn':
        return 'ವ್ಯಾಪಾರ ಡೇಟಾ ಲೋಡ್ ಮಾಡುವಲ್ಲಿ ದೋಷ. ದಯವಿಟ್ಟು ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ.';
      default:
        return 'Error loading business data. Please refresh the page.';
    }
  };

  const getRetryText = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'फिर से कोशिश करें';
      case 'kn':
        return 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ';
      default:
        return 'Retry';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{getLoadingText(language)}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{getErrorText(language)}</p>
          <button
            onClick={loadBusinessContext}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {getRetryText(language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {getPageTitle(language)}
            </h1>
            
            {/* Business Summary */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="text-center">
                <p className="font-medium">
                  {language === 'hi' ? 'आज की बिक्री' :
                   language === 'kn' ? 'ಇಂದಿನ ಮಾರಾಟ' :
                   'Today\'s Sales'}
                </p>
                <p className="text-lg font-bold text-green-600">
                  ₹{businessContext.todaysSales.reduce((sum, t) => sum + t.amount, 0)}
                </p>
              </div>
              
              <div className="text-center">
                <p className="font-medium">
                  {language === 'hi' ? 'कुल उत्पाद' :
                   language === 'kn' ? 'ಒಟ್ಟು ಉತ್ಪನ್ನಗಳು' :
                   'Total Products'}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {businessContext.inventory.length}
                </p>
              </div>
              
              <div className="text-center">
                <p className="font-medium">
                  {language === 'hi' ? 'कम स्टॉक' :
                   language === 'kn' ? 'ಕಡಿಮೆ ಸ್ಟಾಕ್' :
                   'Low Stock'}
                </p>
                <p className="text-lg font-bold text-orange-600">
                  {businessContext.inventory.filter(p => p.stock <= p.reorderThreshold).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <ChatInterface
            businessContext={businessContext}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title={language === 'hi' ? 'आज की बिक्री देखें' :
                   language === 'kn' ? 'ಇಂದಿನ ಮಾರಾಟ ನೋಡಿ' :
                   'View Today\'s Sales'}
            description={language === 'hi' ? 'आज के सभी लेन-देन देखें' :
                        language === 'kn' ? 'ಇಂದಿನ ಎಲ್ಲಾ ವ್ಯವಹಾರಗಳನ್ನು ನೋಡಿ' :
                        'See all transactions from today'}
            icon="💰"
            onClick={() => {/* Navigate to sales page */}}
          />
          
          <QuickActionCard
            title={language === 'hi' ? 'स्टॉक की जांच करें' :
                   language === 'kn' ? 'ಸ್ಟಾಕ್ ಪರಿಶೀಲಿಸಿ' :
                   'Check Inventory'}
            description={language === 'hi' ? 'अपने उत्पादों का स्टॉक देखें' :
                        language === 'kn' ? 'ನಿಮ್ಮ ಉತ್ಪನ್ನಗಳ ಸ್ಟಾಕ್ ನೋಡಿ' :
                        'View your product stock levels'}
            icon="📦"
            onClick={() => {/* Navigate to inventory page */}}
          />
          
          <QuickActionCard
            title={language === 'hi' ? 'नया लेन-देन' :
                   language === 'kn' ? 'ಹೊಸ ವ್ಯವಹಾರ' :
                   'New Transaction'}
            description={language === 'hi' ? 'मैन्युअल लेन-देन जोड़ें' :
                        language === 'kn' ? 'ಹಸ್ತಚಾಲಿತ ವ್ಯವಹಾರ ಸೇರಿಸಿ' :
                        'Add a manual transaction'}
            icon="➕"
            onClick={() => {/* Navigate to transaction page */}}
          />
        </div>
      </div>
    </div>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-left w-full"
    >
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </button>
  );
};