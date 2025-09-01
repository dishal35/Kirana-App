import React, { useState } from 'react';
import type { Product, InventoryAdjustment } from '../../types';

interface EnhancedStockAdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustment: InventoryAdjustment) => Promise<void>;
}

const REASON_CODES = {
  adjustment: [
    { code: 'COUNT_CORRECTION', label: 'Inventory Count Correction' },
    { code: 'SYSTEM_ERROR', label: 'System Error Correction' },
    { code: 'MANUAL_OVERRIDE', label: 'Manual Override' },
  ],
  restock: [
    { code: 'SUPPLIER_DELIVERY', label: 'Supplier Delivery' },
    { code: 'TRANSFER_IN', label: 'Transfer from Another Location' },
    { code: 'RETURN_TO_STOCK', label: 'Customer Return' },
  ],
  damage: [
    { code: 'TRANSPORT_DAMAGE', label: 'Damaged During Transport' },
    { code: 'HANDLING_DAMAGE', label: 'Damaged During Handling' },
    { code: 'QUALITY_ISSUE', label: 'Quality Issue' },
    { code: 'THEFT_LOSS', label: 'Theft/Loss' },
  ],
  expiry: [
    { code: 'EXPIRED_REMOVAL', label: 'Expired Products Removed' },
    { code: 'NEAR_EXPIRY_DISCOUNT', label: 'Near Expiry Discount Sale' },
    { code: 'EXPIRY_WRITE_OFF', label: 'Expiry Write-off' },
  ],
};

export const EnhancedStockAdjustmentModal: React.FC<EnhancedStockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'adjustment' | 'restock' | 'damage' | 'expiry'>('adjustment');
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reasonCode, setReasonCode] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [expiryDate, setExpiryDate] = useState<string>(
    product?.expiryDate ? product.expiryDate.toISOString().split('T')[0] : ''
  );
  const [updateExpiryDate, setUpdateExpiryDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setError(null);

    const quantity = parseInt(quantityChange);
    if (isNaN(quantity) || quantity === 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (!reasonCode && !customReason.trim()) {
      setError('Please select a reason code or provide a custom reason');
      return;
    }

    // Validate that negative adjustments don't exceed current stock
    if (quantity < 0 && Math.abs(quantity) > product.stock) {
      setError(`Cannot reduce stock by ${Math.abs(quantity)}. Current stock: ${product.stock}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReason = reasonCode ? 
        REASON_CODES[adjustmentType].find(r => r.code === reasonCode)?.label || reasonCode :
        customReason.trim();

      await onConfirm({
        productId: product.id!,
        quantityChange: quantity,
        reason: finalReason,
        reasonCode: reasonCode || 'CUSTOM',
        type: adjustmentType,
        expiryDate: updateExpiryDate ? (expiryDate ? new Date(expiryDate) : null) : undefined
      });
      
      // Reset form
      setQuantityChange('');
      setReasonCode('');
      setCustomReason('');
      setAdjustmentType('adjustment');
      setUpdateExpiryDate(false);
      setExpiryDate(product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableReasonCodes = () => {
    return REASON_CODES[adjustmentType] || [];
  };

  const getPlaceholderReason = (type: string) => {
    switch (type) {
      case 'restock': return 'e.g., New delivery from supplier XYZ';
      case 'damage': return 'e.g., Damaged during transport - Invoice #123';
      case 'expiry': return 'e.g., Expired products removed - Batch #ABC';
      case 'adjustment': return 'e.g., Physical count correction - Audit 2024';
      default: return 'Enter detailed reason for adjustment';
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Enhanced Stock Adjustment</h2>
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
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-1">
            <p>Current Stock: {product.stock}</p>
            <p>Reorder Threshold: {product.reorderThreshold}</p>
            <p>Price: ₹{product.price}</p>
            {product.expiryDate && (
              <p>Current Expiry: {product.expiryDate.toLocaleDateString('en-IN')}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => {
                setAdjustmentType(e.target.value as any);
                setReasonCode(''); // Reset reason code when type changes
              }}
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
              Reason Code
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select a reason code...</option>
              {getAvailableReasonCodes().map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
              <option value="CUSTOM">Custom Reason</option>
            </select>
          </div>

          {(!reasonCode || reasonCode === 'CUSTOM') && (
            <div>
              <label htmlFor="custom-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Custom Reason
              </label>
              <textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={getPlaceholderReason(adjustmentType)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
                required={!reasonCode}
              />
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="update-expiry"
                checked={updateExpiryDate}
                onChange={(e) => setUpdateExpiryDate(e.target.checked)}
                className="mr-2"
                disabled={isSubmitting}
              />
              <label htmlFor="update-expiry" className="text-sm font-medium text-gray-700">
                Update Expiry Date
              </label>
            </div>
            
            {updateExpiryDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to remove expiry date
                </p>
              </div>
            )}
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