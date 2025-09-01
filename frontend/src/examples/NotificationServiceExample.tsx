import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/NotificationService';
import type { Notification, Product } from '../types';
import { db } from '../dbs/db';

const NotificationServiceExample: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = notificationService.addListener((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Load initial data
    loadNotifications();
    loadUnreadCount();
    loadStats();

    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    const allNotifications = await notificationService.getNotifications();
    setNotifications(allNotifications);
  };

  const loadUnreadCount = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  const loadStats = async () => {
    const notificationStats = await notificationService.getStats();
    setStats(notificationStats);
  };

  const addSampleNotification = async () => {
    await notificationService.addNotification({
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: 'Sample Product is running low (3 remaining)',
      priority: 'high',
      read: false,
      actionable: true,
      data: { productId: 'sample-product', currentStock: 3 }
    });
  };

  const addSampleProducts = async () => {
    const sampleProducts: Product[] = [
      {
        id: 'low-stock-product',
        name: 'Low Stock Item',
        price: 100,
        stock: 2,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'expiring-product',
        name: 'Expiring Item',
        price: 150,
        stock: 15,
        reorderThreshold: 5,
        category: 'perishable',
        expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.products.bulkAdd(sampleProducts);
  };

  const triggerLowStockCheck = async () => {
    await notificationService.checkLowStock();
  };

  const triggerExpiryCheck = async () => {
    await notificationService.checkExpiringProducts();
  };

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    await loadUnreadCount();
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    await loadUnreadCount();
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAll();
    await loadUnreadCount();
    await loadStats();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return '📦';
      case 'out_of_stock': return '❌';
      case 'expiry_warning': return '⚠️';
      case 'expired': return '🚫';
      case 'transaction': return '💰';
      case 'reorder': return '🔄';
      default: return '📢';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notification Service Example</h1>
      
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addSampleNotification}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Sample Notification
          </button>
          <button
            onClick={addSampleProducts}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Sample Products
          </button>
          <button
            onClick={triggerLowStockCheck}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Check Low Stock
          </button>
          <button
            onClick={triggerExpiryCheck}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Check Expiry
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Mark All Read
          </button>
          <button
            onClick={clearAllNotifications}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Notifications</h3>
          <p className="text-2xl font-bold text-blue-600">{stats?.total || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800">Unread Count</h3>
          <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Critical Notifications</h3>
          <p className="text-2xl font-bold text-green-600">{stats?.byPriority?.critical || 0}</p>
        </div>
      </div>

      {/* Priority Breakdown */}
      {stats && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Priority Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>Critical: {stats.byPriority.critical}</div>
            <div>High: {stats.byPriority.high}</div>
            <div>Medium: {stats.byPriority.medium}</div>
            <div>Low: {stats.byPriority.low}</div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Notifications ({notifications.length})</h2>
        
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications yet. Try adding some sample data!
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.read ? 'bg-gray-50 opacity-75' : 'bg-white'
                } ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTypeIcon(notification.type)}</span>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(notification.priority)}`}>
                        {notification.priority}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{notification.message}</p>
                    <div className="text-xs text-gray-500">
                      {notification.timestamp.toLocaleString()}
                      {notification.actionable && (
                        <span className="ml-2 text-blue-600">• Actionable</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id!)}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => notificationService.deleteNotification(notification.id!)}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {notification.data && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                    <strong>Data:</strong> {JSON.stringify(notification.data, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationServiceExample;