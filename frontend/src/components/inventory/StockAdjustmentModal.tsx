import React, { useState } from 'react';
import type { Product, InventoryAdjustment } from '../../types';

interface StockAdjustmentModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (adjustment: InventoryAdjustment) => Promise<void>;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onAdjust
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'adjustment' | 'restock' | 'damage' | 'expiry'>('adjustment');
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState('');
  const [expiryDate, setExpiryDate] = useState<string>(
    product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const quantity = parseInt(quantityChange);
    if (isNaN(quantity) || quantity === 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    // Validate that negative adjustments don't exceed current stock
    if (quantity < 0 && Math.abs(quantity) > product.stock) {
      setError(`Cannot reduce stock by ${Math.abs(quantity)}. Current stock: ${product.stock}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdjust({
        productId: product.id!,
        quantityChange: quantity,
        reason: reason.trim(),
        type: adjustmentType,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      });
      
      // Reset form
      setQuantityChange('');
      setReason('');
      setAdjustmentType('adjustment');
      setExpiryDate(product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'restock': return 'Restock';
      case 'damage': return 'Damage/Loss';
      case 'expiry': return 'Expired';
      case 'adjustment': return 'Manual Adjustment';
      default: return type;
    }
  };

  const getPlaceholderReason = (type: string) => {
    switch (type) {
      case 'restock': return 'e.g., New delivery from supplier';
      case 'damage': return 'e.g., Damaged during transport';
      case 'expiry': return 'e.g., Expired products removed';
      case 'adjustment': return 'e.g., Inventory count correction';
      default: return 'Enter reason for adjustment';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Adjust Stock</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-sm text-gray-600">Current Stock: {product.stock}</p>
          <p className="text-sm text-gray-600">Reorder Threshold: {product.reorderThreshold}</p>
          {product.expiryDate && (
            <p className="text-sm text-gray-600">
              Current Expiry: {product.expiryDate.toLocaleDateString('en-IN')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
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
            <div className="relative">
              <input
                type="number"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                placeholder="Enter positive or negative number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
                required
              />
              <div className="absolute right-2 top-2 text-xs text-gray-500">
                {quantityChange && !isNaN(parseInt(quantityChange)) && (
                  <span>
                    New stock: {product.stock + parseInt(quantityChange)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use positive numbers to add stock, negative to reduce
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to remove expiry date, or set a new expiry date
            </p>
          </div>

          <div>
            <label htmlFor="reason-input" className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              id="reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={getPlaceholderReason(adjustmentType)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};