import React, { useState, useEffect } from 'react';
import { NotificationBell, NotificationPanel } from '../components/notifications';
import { notificationService } from '../services/NotificationService';

/**
 * Example component demonstrating the notification UI components
 * Shows how to integrate NotificationBell and NotificationPanel
 */
export const NotificationUIExample: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    // Add some sample notifications for demonstration
    const addSampleNotifications = async () => {
      try {
        await notificationService.addNotification({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: 'Milk packets are running low (3 remaining)',
          priority: 'high',
          read: false,
          actionable: true,
          data: { productId: 'milk-001', productName: 'Milk Packets' }
        });

        await notificationService.addNotification({
          type: 'transaction',
          title: 'Transaction Completed',
          message: '₹150 UPI payment received',
          priority: 'medium',
          read: false,
          actionable: false,
          data: { transactionId: 'txn-001', amount: 150 }
        });

        await notificationService.addNotification({
          type: 'expiry_warning',
          title: 'Product Expiring Soon',
          message: 'Bread expires in 2 hours',
          priority: 'critical',
          read: false,
          actionable: true,
          data: { productId: 'bread-001', productName: 'Bread', hoursUntilExpiry: 2 }
        });
      } catch (error) {
        console.error('Failed to add sample notifications:', error);
      }
    };

    addSampleNotifications();
  }, []);

  const handleBellClick = () => {
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Notification UI Components Example
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Notification Bell & Panel
          </h2>
          
          <p className="text-gray-600 mb-6">
            Click the notification bell to open the notification panel. The bell shows an unread count badge.
            The panel allows filtering, marking as read, and taking actions on notifications.
          </p>

          {/* Navigation bar simulation */}
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">
                App Navigation
              </h3>
              
              <div className="relative">
                <NotificationBell 
                  onClick={handleBellClick}
                  className="hover:bg-gray-200"
                />
                
                <NotificationPanel
                  isOpen={isPanelOpen}
                  onClose={handlePanelClose}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Features:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Real-time unread count badge on notification bell</li>
              <li>Sliding notification panel with responsive design</li>
              <li>Filter notifications by read status, actionable items, and priority</li>
              <li>Priority-based visual styling (critical, high, medium, low)</li>
              <li>Quick actions for different notification types</li>
              <li>Mark individual notifications as read or delete them</li>
              <li>Bulk actions: Mark all as read or clear all notifications</li>
              <li>Mobile-friendly touch interface</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Notification Types & Priorities
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Notification Types:</h3>
              <ul className="space-y-2 text-gray-600">
                <li><span className="font-medium">Low Stock:</span> Product inventory alerts</li>
                <li><span className="font-medium">Out of Stock:</span> Zero inventory warnings</li>
                <li><span className="font-medium">Expiry Warning:</span> Products expiring soon</li>
                <li><span className="font-medium">Expired:</span> Products that have expired</li>
                <li><span className="font-medium">Transaction:</span> Completed sales notifications</li>
                <li><span className="font-medium">Reorder:</span> Restock reminders</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Priority Levels:</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  <span className="font-medium text-red-600">Critical</span>
                  <span className="text-gray-600 ml-2">- Expired products, out of stock</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  <span className="font-medium text-orange-600">High</span>
                  <span className="text-gray-600 ml-2">- Low stock, expiring soon</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  <span className="font-medium text-yellow-600">Medium</span>
                  <span className="text-gray-600 ml-2">- Transactions, reorder alerts</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  <span className="font-medium text-blue-600">Low</span>
                  <span className="text-gray-600 ml-2">- General information</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};