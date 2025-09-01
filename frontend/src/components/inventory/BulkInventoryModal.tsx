import React, { useState, useEffect } from 'react';
import { productRepository } from '../../dbs/repo';
import type { Product, InventoryAdjustment } from '../../types';

interface BulkInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustments: InventoryAdjustment[], notes?: string) => Promise<void>;
}

interface BulkAdjustmentItem {
  product: Product;
  quantityChange: number;
  reason: string;
  type: 'adjustment' | 'restock' | 'damage' | 'expiry';
  expiryDate?: Date | null;
}

export const BulkInventoryModal: React.FC<BulkInventoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<'adjustment' | 'restock' | 'damage' | 'expiry'>('adjustment');
  const [bulkQuantityChange, setBulkQuantityChange] = useState<string>('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkExpiryDate, setBulkExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [adjustments, setAdjustments] = useState<BulkAdjustmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const loadProducts = async () => {
    try {
      const allProducts = await productRepository.getAll();
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError('Failed to load products');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

  const handleProductSelection = (productId: string, selected: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (selected) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id!)));
    }
  };

  const applyBulkSettings = () => {
    const quantity = parseInt(bulkQuantityChange);
    if (isNaN(quantity) || quantity === 0) {
      setError('Please enter a valid quantity change');
      return;
    }

    if (!bulkReason.trim()) {
      setError('Please provide a reason for the bulk adjustment');
      return;
    }

    const newAdjustments: BulkAdjustmentItem[] = [];
    
    selectedProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) {
        // Validate that negative adjustments don't exceed current stock
        if (quantity < 0 && Math.abs(quantity) > product.stock) {
          setError(`Cannot reduce stock for ${product.name} by ${Math.abs(quantity)}. Current stock: ${product.stock}`);
          return;
        }

        newAdjustments.push({
          product,
          quantityChange: quantity,
          reason: bulkReason.trim(),
          type: bulkType,
          expiryDate: bulkExpiryDate ? new Date(bulkExpiryDate) : null
        });
      }
    });

    if (newAdjustments.length > 0) {
      setAdjustments(newAdjustments);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (adjustments.length === 0) {
      setError('No adjustments to apply');
      return;
    }

    setIsSubmitting(true);
    try {
      const inventoryAdjustments: InventoryAdjustment[] = adjustments.map(adj => ({
        productId: adj.product.id!,
        quantityChange: adj.quantityChange,
        reason: adj.reason,
        type: adj.type,
        expiryDate: adj.expiryDate
      }));

      await onConfirm(inventoryAdjustments, notes.trim() || undefined);
      
      // Reset form
      setSelectedProducts(new Set());
      setAdjustments([]);
      setBulkQuantityChange('');
      setBulkReason('');
      setBulkExpiryDate('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAdjustment = (index: number) => {
    const newAdjustments = [...adjustments];
    newAdjustments.splice(index, 1);
    setAdjustments(newAdjustments);
  };

  const getTotalImpact = () => {
    return adjustments.reduce((total, adj) => {
      const newStock = adj.product.stock + adj.quantityChange;
      const valueChange = adj.quantityChange * adj.product.price;
      return total + valueChange;
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bulk Inventory Operations</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {adjustments.length === 0 ? (
            // Product Selection Phase
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="adjustment">Manual Adjustment</option>
                    <option value="restock">Restock</option>
                    <option value="damage">Damage/Loss</option>
                    <option value="expiry">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Change
                  </label>
                  <input
                    type="number"
                    value={bulkQuantityChange}
                    onChange={(e) => setBulkQuantityChange(e.target.value)}
                    placeholder="e.g., +10 or -5"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={bulkExpiryDate}
                    onChange={(e) => setBulkExpiryDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    &nbsp;
                  </label>
                  <button
                    onClick={applyBulkSettings}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={selectedProducts.size === 0}
                  >
                    Apply to Selected
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Enter reason for bulk adjustment..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Product Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Products
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Selection */}
              <div className="border border-gray-200 rounded-md">
                <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">
                      Select All ({selectedProducts.size} of {filteredProducts.length} selected)
                    </span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="p-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id!)}
                          onChange={(e) => handleProductSelection(product.id!, e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            Stock: {product.stock} | Price: ₹{product.price} | Category: {product.category}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Review Phase
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-medium text-blue-900 mb-2">Bulk Operation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Products:</span>
                    <span className="ml-1 font-medium">{adjustments.length}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Type:</span>
                    <span className="ml-1 font-medium capitalize">{bulkType}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Value Impact:</span>
                    <span className={`ml-1 font-medium ${getTotalImpact() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(getTotalImpact()).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => setAdjustments([])}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      ← Back to Selection
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this bulk operation..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="border border-gray-200 rounded-md">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-medium">Adjustments to Apply</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {adjustments.map((adjustment, index) => (
                    <div key={index} className="p-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{adjustment.product.name}</div>
                        <div className="text-sm text-gray-600">
                          Current: {adjustment.product.stock} → New: {adjustment.product.stock + adjustment.quantityChange}
                          <span className={`ml-2 ${adjustment.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({adjustment.quantityChange >= 0 ? '+' : ''}{adjustment.quantityChange})
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAdjustment(index)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          {adjustments.length > 0 && (
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : `Apply ${adjustments.length} Adjustments`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};