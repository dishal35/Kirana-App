import React, { useState } from 'react';
import { inventoryManager } from '../../services/InventoryManager';
import { productRepository } from '../../dbs/repo';
import type { ExpiryAlert, Product } from '../../types';

interface ExpiryTrackingPanelProps {
  alerts: ExpiryAlert[];
  onRefresh: () => Promise<void>;
}

export const ExpiryTrackingPanel: React.FC<ExpiryTrackingPanelProps> = ({
  alerts,
  onRefresh
}) => {
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [processing, setProcessing] = useState(false);

  const getSeverityColor = (severity: ExpiryAlert['severity']) => {
    switch (severity) {
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: ExpiryAlert['severity']) => {
    switch (severity) {
      case 'expired': return '🚨';
      case 'critical': return '⚠️';
      case 'warning': return '⏰';
      default: return '📅';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatDaysUntilExpiry = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days === 1) return 'Expires today';
    return `${days} days left`;
  };

  const handleAlertSelection = (alertId: string, selected: boolean) => {
    const newSelected = new Set(selectedAlerts);
    if (selected) {
      newSelected.add(alertId);
    } else {
      newSelected.delete(alertId);
    }
    setSelectedAlerts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedAlerts(new Set(alerts.map(a => a.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkMarkAsHandled = async () => {
    setProcessing(true);
    try {
      // In a real implementation, you would mark these alerts as handled
      // For now, we'll just refresh the data
      await onRefresh();
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to mark alerts as handled:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkRemoveExpired = async () => {
    setProcessing(true);
    try {
      const expiredAlerts = alerts.filter(alert => 
        selectedAlerts.has(alert.id) && alert.severity === 'expired'
      );

      // Create bulk adjustment to remove expired stock
      const adjustments = expiredAlerts.map(alert => ({
        productId: alert.productId,
        quantityChange: -alert.currentStock,
        reason: `Expired products removed - Expiry date: ${formatDate(alert.expiryDate)}`,
        type: 'expiry' as const,
        reasonCode: 'EXPIRED_REMOVAL'
      }));

      if (adjustments.length > 0) {
        await inventoryManager.performBulkAdjustments(
          adjustments,
          `Bulk removal of expired products - ${adjustments.length} products affected`
        );
      }

      await onRefresh();
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to remove expired products:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getTotalEstimatedLoss = () => {
    return alerts
      .filter(alert => selectedAlerts.has(alert.id))
      .reduce((total, alert) => total + (alert.estimatedLoss || 0), 0);
  };

  const groupedAlerts = {
    expired: alerts.filter(a => a.severity === 'expired'),
    critical: alerts.filter(a => a.severity === 'critical'),
    warning: alerts.filter(a => a.severity === 'warning')
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Expired</h3>
              <p className="text-red-600">{groupedAlerts.expired.length} products</p>
              <p className="text-sm text-red-500">
                Loss: ₹{groupedAlerts.expired.reduce((sum, a) => sum + (a.estimatedLoss || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-orange-800">Critical</h3>
              <p className="text-orange-600">{groupedAlerts.critical.length} products</p>
              <p className="text-sm text-orange-500">Expires within 24 hours</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⏰</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Warning</h3>
              <p className="text-yellow-600">{groupedAlerts.warning.length} products</p>
              <p className="text-sm text-yellow-500">Expires within 7 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                {selectedAlerts.size} alerts selected
              </h4>
              <p className="text-sm text-blue-700">
                Estimated loss: ₹{getTotalEstimatedLoss().toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkMarkAsHandled}
                disabled={processing}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Mark as Handled
              </button>
              <button
                onClick={handleBulkRemoveExpired}
                disabled={processing || !alerts.some(a => selectedAlerts.has(a.id) && a.severity === 'expired')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Remove Expired Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedAlerts.size === alerts.length && alerts.length > 0}
              onChange={handleSelectAll}
              className="mr-3"
            />
            <h3 className="text-lg font-semibold">Expiry Alerts</h3>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-medium">No expiry alerts</p>
              <p className="text-sm">All products are within safe expiry periods</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.has(alert.id)}
                    onChange={(e) => handleAlertSelection(alert.id, e.target.checked)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                        <h4 className="font-medium text-gray-900">{alert.productName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Stock: {alert.currentStock}
                        </p>
                        {alert.estimatedLoss && (
                          <p className="text-sm text-red-600">
                            Loss: ₹{alert.estimatedLoss.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Expiry Date:</span>
                        <span className="ml-1">{formatDate(alert.expiryDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className={`ml-1 ${
                          alert.daysUntilExpiry <= 0 ? 'text-red-600 font-medium' :
                          alert.daysUntilExpiry <= 1 ? 'text-orange-600 font-medium' :
                          'text-yellow-600'
                        }`}>
                          {formatDaysUntilExpiry(alert.daysUntilExpiry)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Action Required:</span>
                        <span className="ml-1">
                          {alert.severity === 'expired' ? 'Remove from stock' :
                           alert.severity === 'critical' ? 'Urgent sale/discount' :
                           'Monitor closely'}
                        </span>
                      </div>
                    </div>

                    {alert.severity === 'expired' && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        ⚠️ This product has expired and should be removed from inventory immediately
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};