import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { inventoryManager } from '../../services/InventoryManager';
import { productRepository } from '../../dbs/repo';
import { InventoryDashboard } from './InventoryDashboard';
import { StockAlerts } from './StockAlerts';
import { EnhancedStockAdjustmentModal } from './EnhancedStockAdjustmentModal';
import { BulkInventoryModal } from './BulkInventoryModal';
import { InventoryAnalyticsPanel } from './InventoryAnalyticsPanel';
import { ExpiryTrackingPanel } from './ExpiryTrackingPanel';
import { LoadingSpinner } from '../LoadingSpinner';
import type { Product, InventoryAdjustment, ExpiryAlert, InventoryAnalytics } from '../../types';

export const EnhancedInventoryPage: React.FC = () => {
  const { state, dispatch, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'expiry' | 'analytics' | 'adjustments'>('overview');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEnhancedData = async () => {
    try {
      setLoading(true);
      const [alerts, analyticsData] = await Promise.all([
        inventoryManager.getExpiryAlerts(),
        inventoryManager.getInventoryAnalytics(30)
      ]);
      
      setExpiryAlerts(alerts);
      setAnalytics(analyticsData);
      await refreshData();
    } catch (error) {
      console.error('Failed to load enhanced inventory data:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load inventory data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnhancedData();
  }, []);

  const handleStockAdjustment = async (adjustment: InventoryAdjustment) => {
    try {
      await inventoryManager.adjustStock(adjustment);
      await loadEnhancedData();
      setShowAdjustmentModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to adjust stock' });
    }
  };

  const handleBulkOperation = async (adjustments: InventoryAdjustment[], notes?: string) => {
    try {
      await inventoryManager.performBulkAdjustments(adjustments, notes);
      await loadEnhancedData();
      setShowBulkModal(false);
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to perform bulk operation' });
    }
  };

  const getTabTitle = (tab: string) => {
    const titles = {
      overview: {
        en: 'Overview',
        hi: 'अवलोकन',
        kn: 'ಅವಲೋಕನ',
      },
      expiry: {
        en: 'Expiry Tracking',
        hi: 'समाप्ति ट्रैकिंग',
        kn: 'ಅವಧಿ ಟ್ರ್ಯಾಕಿಂಗ್',
      },
      analytics: {
        en: 'Analytics',
        hi: 'विश्लेषण',
        kn: 'ವಿಶ್ಲೇಷಣೆ',
      },
      adjustments: {
        en: 'Adjustments',
        hi: 'समायोजन',
        kn: 'ಹೊಂದಾಣಿಕೆಗಳು',
      },
    };

    return titles[tab as keyof typeof titles]?.[state.language] || tab;
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" text="Loading enhanced inventory..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {state.language === 'hi' ? 'उन्नत स्टॉक प्रबंधन' :
             state.language === 'kn' ? 'ಸುಧಾರಿತ ಸ್ಟಾಕ್ ನಿರ್ವಹಣೆ' :
             'Enhanced Inventory Management'}
          </h1>
          <p className="text-gray-600">
            {state.language === 'hi' ? 'उन्नत सुविधाओं के साथ अपने स्टॉक का प्रबंधन करें' :
             state.language === 'kn' ? 'ಸುಧಾರಿತ ವೈಶಿಷ್ಟ್ಯಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಸ್ಟಾಕ್ ನಿರ್ವಹಿಸಿ' :
             'Manage your inventory with advanced features'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            {state.language === 'hi' ? 'बल्क ऑपरेशन' :
             state.language === 'kn' ? 'ಬಲ್ಕ್ ಆಪರೇಶನ್' :
             'Bulk Operations'}
          </button>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {state.language === 'hi' ? 'स्टॉक समायोजित करें' :
             state.language === 'kn' ? 'ಸ್ಟಾಕ್ ಹೊಂದಿಸಿ' :
             'Adjust Stock'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Total Value</h3>
            <p className="text-xl font-bold text-green-600">₹{analytics.totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Products</h3>
            <p className="text-xl font-bold text-gray-900">{analytics.totalProducts}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Low Stock</h3>
            <p className="text-xl font-bold text-yellow-600">{analytics.lowStockCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Out of Stock</h3>
            <p className="text-xl font-bold text-red-600">{analytics.outOfStockCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Expiring</h3>
            <p className="text-xl font-bold text-orange-600">{analytics.expiringCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">Expired</h3>
            <p className="text-xl font-bold text-red-700">{analytics.expiredCount}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'expiry', 'analytics', 'adjustments'] as const).map((tab) => (
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
        
        {activeTab === 'expiry' && (
          <ExpiryTrackingPanel 
            alerts={expiryAlerts} 
            onRefresh={loadEnhancedData}
          />
        )}
        
        {activeTab === 'analytics' && analytics && (
          <InventoryAnalyticsPanel 
            analytics={analytics}
            onRefresh={loadEnhancedData}
          />
        )}
        
        {activeTab === 'adjustments' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {state.language === 'hi' ? 'स्टॉक समायोजन इतिहास' :
               state.language === 'kn' ? 'ಸ್ಟಾಕ್ ಹೊಂದಾಣಿಕೆ ಇತಿಹಾಸ' :
               'Stock Adjustment History'}
            </h3>
            {/* This will be implemented in the audit trail component */}
            <p className="text-gray-600">
              {state.language === 'hi' ? 'विस्तृत समायोजन इतिहास यहाँ दिखाया जाएगा...' :
               state.language === 'kn' ? 'ವಿವರವಾದ ಹೊಂದಾಣಿಕೆ ಇತಿಹಾಸ ಇಲ್ಲಿ ತೋರಿಸಲಾಗುವುದು...' :
               'Detailed adjustment history will be shown here...'}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <EnhancedStockAdjustmentModal
          isOpen={showAdjustmentModal}
          product={selectedProduct}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedProduct(null);
          }}
          onConfirm={handleStockAdjustment}
        />
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <BulkInventoryModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onConfirm={handleBulkOperation}
        />
      )}
    </div>
  );
};