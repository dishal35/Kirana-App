import React, { useState, useEffect } from 'react';
import { inventoryManager } from '../../services/InventoryManager';
import { productRepository } from '../../dbs/repo';
import { StockAlerts } from './StockAlerts';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { InventoryAuditTrail } from './InventoryAuditTrail';
import type { Product, InventoryAdjustment } from '../../types';

export const InventoryDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [expiredProducts, setExpiredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [selectedProductForAudit, setSelectedProductForAudit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        allProducts,
        lowStock,
        outOfStock,
        expiring,
        expired
      ] = await Promise.all([
        productRepository.getAll(),
        inventoryManager.getLowStockProducts(),
        inventoryManager.getOutOfStockProducts(),
        inventoryManager.getExpiringProducts(7),
        inventoryManager.getExpiredProducts()
      ]);

      setProducts(allProducts);
      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);
      setExpiringProducts(expiring);
      setExpiredProducts(expired);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  const handleStockAdjustment = async (adjustment: InventoryAdjustment) => {
    await inventoryManager.adjustStock(adjustment);
    await loadInventoryData(); // Refresh data
    setShowAdjustmentModal(false);
    setSelectedProduct(null);
  };

  const openAdjustmentModal = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustmentModal(true);
  };

  const openAuditTrail = (productId: string) => {
    setSelectedProductForAudit(productId);
    setShowAuditTrail(true);
  };

  const getStockStatusColor = (product: Product) => {
    if (product.stock === 0) return 'text-red-600 bg-red-50';
    if (product.stock <= product.reorderThreshold) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (product: Product) => {
    if (product.stock === 0) return 'Out of Stock';
    if (product.stock <= product.reorderThreshold) return 'Low Stock';
    return 'In Stock';
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
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadInventoryData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Products</h3>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Out of Stock</h3>
          <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Expiring Soon</h3>
          <p className="text-2xl font-bold text-orange-600">{expiringProducts.length}</p>
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <StockAlerts onRefresh={loadInventoryData} />
      </div>

      {/* Product List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Product Inventory</h2>
            <button
              onClick={loadInventoryData}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded-full mr-3 object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ₹{product.price}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.stock}</div>
                    <div className="text-xs text-gray-500">
                      Threshold: {product.reorderThreshold}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product)}`}>
                      {getStockStatusText(product)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.expiryDate ? (
                      <span className={
                        product.expiryDate <= new Date() ? 'text-red-600' :
                        product.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-orange-600' :
                        'text-gray-600'
                      }>
                        {formatDate(product.expiryDate)}
                      </span>
                    ) : (
                      <span className="text-gray-400">No expiry</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openAdjustmentModal(product)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => openAuditTrail(product.id!)}
                      className="text-green-600 hover:text-green-900"
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedProduct(null);
          }}
          onAdjust={handleStockAdjustment}
        />
      )}

      {/* Audit Trail Modal */}
      {showAuditTrail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Inventory Audit Trail</h2>
              <button
                onClick={() => {
                  setShowAuditTrail(false);
                  setSelectedProductForAudit(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <InventoryAuditTrail productId={selectedProductForAudit || undefined} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};