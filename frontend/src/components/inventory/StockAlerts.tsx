import React, { useState, useEffect } from 'react';
import { inventoryManager } from '../../services/InventoryManager';
import { productRepository } from '../../dbs/repo';
import type { StockAlert, Product } from '../../types';

interface StockAlertsProps {
  onRefresh?: () => void;
}

export const StockAlerts: React.FC<StockAlertsProps> = ({ onRefresh }) => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeAlerts, allProducts] = await Promise.all([
        inventoryManager.getActiveStockAlerts(),
        productRepository.getAll()
      ]);

      setAlerts(activeAlerts);
      
      // Create product lookup map
      const productMap = new Map();
      allProducts.forEach(product => {
        if (product.id) {
          productMap.set(product.id, product);
        }
      });
      setProducts(productMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await inventoryManager.acknowledgeAlert(alertId);
      await loadAlerts(); // Refresh alerts
      onRefresh?.(); // Notify parent to refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const getAlertIcon = (type: StockAlert['type']) => {
    switch (type) {
      case 'out_of_stock': return '🚫';
      case 'low_stock': return '⚠️';
      case 'expiry_warning': return '⏰';
      case 'expired': return '❌';
      default: return '📢';
    }
  };

  const getAlertColor = (type: StockAlert['type']) => {
    switch (type) {
      case 'out_of_stock': return 'bg-red-50 border-red-200 text-red-800';
      case 'low_stock': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'expiry_warning': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'expired': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAlerts}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-4xl mb-2">✅</div>
        <p className="font-medium">No active alerts</p>
        <p className="text-sm">All your inventory is in good condition</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          Stock Alerts ({alerts.length})
        </h3>
        <button
          onClick={loadAlerts}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const product = products.get(alert.productId);
          return (
            <div
              key={alert.id}
              className={`p-3 border rounded-md ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1">
                    <p className="font-medium">
                      {product?.name || 'Unknown Product'}
                    </p>
                    <p className="text-sm">{alert.message}</p>
                    {alert.expiryDate && (
                      <p className="text-xs mt-1">
                        Expiry: {formatDate(alert.expiryDate)}
                      </p>
                    )}
                    {alert.threshold && (
                      <p className="text-xs mt-1">
                        Threshold: {alert.threshold}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDate(alert.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledge(alert.id!)}
                  className="ml-2 px-2 py-1 text-xs bg-white bg-opacity-50 hover:bg-opacity-75 rounded border"
                  title="Acknowledge alert"
                >
                  ✓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};