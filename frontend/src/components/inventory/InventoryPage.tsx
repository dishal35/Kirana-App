import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { InventoryDashboard } from './InventoryDashboard';
import { StockAlerts } from './StockAlerts';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { LoadingSpinner } from '../LoadingSpinner';
import type { Product, InventoryAdjustment } from '../../types';

export const InventoryPage: React.FC = () => {
  const { state, dispatch, refreshData } = useApp();
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'adjustments'>('overview');

  useEffect(() => {
    // Refresh data when component mounts
    refreshData();
  }, []);

  const handleStockAdjustment = async (adjustment: InventoryAdjustment) => {
    try {
      // This would be handled by the inventory manager service
      console.log('Stock adjustment:', adjustment);
      setShowAdjustmentModal(false);
      setSelectedProduct(null);
      await refreshData();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to adjust stock' });
    }
  };

  const getTabTitle = (tab: string) => {
    const titles = {
      overview: {
        en: 'Overview',
        hi: 'अवलोकन',
        kn: 'ಅವಲೋಕನ',
      },
      alerts: {
        en: 'Alerts',
        hi: 'अलर्ट',
        kn: 'ಎಚ್ಚರಿಕೆಗಳು',
      },
      adjustments: {
        en: 'Adjustments',
        hi: 'समायोजन',
        kn: 'ಹೊಂದಾಣಿಕೆಗಳು',
      },
    };

    return titles[tab as keyof typeof titles]?.[state.language] || tab;
  };

  if (state.loading.data) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" text="Loading inventory..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {state.language === 'hi' ? 'स्टॉक प्रबंधन' :
             state.language === 'kn' ? 'ಸ್ಟಾಕ್ ನಿರ್ವಹಣೆ' :
             'Inventory Management'}
          </h1>
          <p className="text-gray-600">
            {state.language === 'hi' ? 'अपने उत्पादों का स्टॉक प्रबंधित करें' :
             state.language === 'kn' ? 'ನಿಮ್ಮ ಉತ್ಪನ್ನಗಳ ಸ್ಟಾಕ್ ನಿರ್ವಹಿಸಿ' :
             'Manage your product stock levels'}
          </p>
        </div>
        
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {state.language === 'hi' ? 'स्टॉक समायोजित करें' :
           state.language === 'kn' ? 'ಸ್ಟಾಕ್ ಹೊಂದಿಸಿ' :
           'Adjust Stock'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'alerts', 'adjustments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabTitle(tab)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <InventoryDashboard />
        )}
        
        {activeTab === 'alerts' && (
          <StockAlerts />
        )}
        
        {activeTab === 'adjustments' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {state.language === 'hi' ? 'स्टॉक समायोजन इतिहास' :
               state.language === 'kn' ? 'ಸ್ಟಾಕ್ ಹೊಂದಾಣಿಕೆ ಇತಿಹಾಸ' :
               'Stock Adjustment History'}
            </h3>
            <p className="text-gray-600">
              {state.language === 'hi' ? 'स्टॉक समायोजन इतिहास जल्द ही उपलब्ध होगा...' :
               state.language === 'kn' ? 'ಸ್ಟಾಕ್ ಹೊಂದಾಣಿಕೆ ಇತಿಹಾಸ ಶೀಘ್ರದಲ್ಲೇ ಲಭ್ಯವಾಗುತ್ತದೆ...' :
               'Stock adjustment history coming soon...'}
            </p>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          isOpen={showAdjustmentModal}
          product={selectedProduct}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedProduct(null);
          }}
          onConfirm={handleStockAdjustment}
        />
      )}
    </div>
  );
};