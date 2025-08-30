import React, { useState, useEffect } from 'react';
import { inventoryManager } from '../../services/InventoryManager';
import { productRepository } from '../../dbs/repo';
import type { InventoryAuditEntry, Product } from '../../types';

interface InventoryAuditTrailProps {
  productId?: string;
  limit?: number;
}

export const InventoryAuditTrail: React.FC<InventoryAuditTrailProps> = ({
  productId,
  limit = 50
}) => {
  const [auditEntries, setAuditEntries] = useState<InventoryAuditEntry[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);

      const [entries, allProducts] = await Promise.all([
        productId 
          ? inventoryManager.getAuditTrail(productId, limit)
          : [], // TODO: Add method to get all audit entries
        productRepository.getAll()
      ]);

      setAuditEntries(entries);
      
      // Create product lookup map
      const productMap = new Map();
      allProducts.forEach(product => {
        if (product.id) {
          productMap.set(product.id, product);
        }
      });
      setProducts(productMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
  }, [productId, limit]);

  const getTypeIcon = (type: InventoryAuditEntry['type']) => {
    switch (type) {
      case 'sale': return '💰';
      case 'restock': return '📦';
      case 'adjustment': return '✏️';
      case 'damage': return '💔';
      case 'expiry': return '⏰';
      default: return '📝';
    }
  };

  const getTypeColor = (type: InventoryAuditEntry['type']) => {
    switch (type) {
      case 'sale': return 'text-green-600';
      case 'restock': return 'text-blue-600';
      case 'adjustment': return 'text-yellow-600';
      case 'damage': return 'text-red-600';
      case 'expiry': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const formatQuantityChange = (change: number) => {
    return change > 0 ? `+${change}` : change.toString();
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading audit trail...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadAuditTrail}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (auditEntries.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-4xl mb-2">📋</div>
        <p className="font-medium">No audit entries</p>
        <p className="text-sm">Stock changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          Inventory Audit Trail
          {productId && products.get(productId) && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              for {products.get(productId)?.name}
            </span>
          )}
        </h3>
        <button
          onClick={loadAuditTrail}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {auditEntries.map((entry) => {
          const product = products.get(entry.productId);
          return (
            <div
              key={entry.id}
              className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{getTypeIcon(entry.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {product?.name || 'Unknown Product'}
                      </span>
                      <span className={`text-sm font-medium ${getTypeColor(entry.type)}`}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>
                        Stock: {entry.previousStock} → {entry.newStock}
                      </span>
                      <span className={entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatQuantityChange(entry.quantityChange)}
                      </span>
                    </div>

                    {entry.reason && (
                      <p className="text-sm text-gray-600 mt-1">
                        Reason: {entry.reason}
                      </p>
                    )}

                    {entry.transactionId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Transaction: {entry.transactionId}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {auditEntries.length === limit && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">
            Showing latest {limit} entries
          </p>
        </div>
      )}
    </div>
  );
};