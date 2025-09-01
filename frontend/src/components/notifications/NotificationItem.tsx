import React from 'react';
import type { Notification } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onAction: (notificationId: string, action: string) => void;
  onNavigate?: (page: string, params?: any) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onAction,
  onNavigate
}) => {
  const getPriorityStyles = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          border: 'border-l-4 border-red-500',
          bg: 'bg-red-50',
          icon: 'text-red-500',
          badge: 'bg-red-500 text-white'
        };
      case 'high':
        return {
          border: 'border-l-4 border-orange-500',
          bg: 'bg-orange-50',
          icon: 'text-orange-500',
          badge: 'bg-orange-500 text-white'
        };
      case 'medium':
        return {
          border: 'border-l-4 border-yellow-500',
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-500 text-white'
        };
      case 'low':
        return {
          border: 'border-l-4 border-blue-500',
          bg: 'bg-blue-50',
          icon: 'text-blue-500',
          badge: 'bg-blue-500 text-white'
        };
      default:
        return {
          border: 'border-l-4 border-gray-300',
          bg: 'bg-gray-50',
          icon: 'text-gray-500',
          badge: 'bg-gray-500 text-white'
        };
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'expiry_warning':
      case 'expired':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'transaction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'reorder':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const handleMarkAsRead = () => {
    if (!notification.read && notification.id) {
      onAction(notification.id, 'mark_read');
    }
  };

  const handleDelete = () => {
    if (notification.id) {
      onAction(notification.id, 'delete');
    }
  };

  const handleQuickAction = () => {
    // Handle quick actions based on notification type
    if (notification.actionable && notification.data && onNavigate) {
      switch (notification.type) {
        case 'low_stock':
        case 'out_of_stock':
          // Navigate to inventory management
          onNavigate('inventory', { 
            productId: notification.data.productId,
            tab: 'overview',
            action: 'adjust_stock'
          });
          break;
        case 'expiry_warning':
        case 'expired':
          // Navigate to inventory with expiry filter
          onNavigate('inventory', { 
            productId: notification.data.productId,
            tab: 'expiry',
            action: 'manage_expiry'
          });
          break;
        case 'transaction':
          // Navigate to transaction logs
          onNavigate('transactions', {
            transactionId: notification.data.transactionId
          });
          break;
        default:
          break;
      }
    }
  };

  const styles = getPriorityStyles(notification.priority);

  return (
    <div
      className={`
        p-4 hover:bg-gray-50 transition-colors cursor-pointer
        ${styles.border} ${!notification.read ? styles.bg : 'bg-white'}
      `}
      onClick={handleMarkAsRead}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                {notification.title}
              </p>
              <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                {notification.message}
              </p>
            </div>

            {/* Priority Badge */}
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2
              ${styles.badge}
            `}>
              {notification.priority.toUpperCase()}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatTimestamp(notification.timestamp)}
            </span>

            {/* Unread indicator */}
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" data-testid="unread-indicator"></div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 mt-3">
            {notification.actionable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAction();
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {notification.type === 'low_stock' || notification.type === 'out_of_stock' 
                  ? 'Manage Stock' 
                  : notification.type === 'expiry_warning' || notification.type === 'expired'
                  ? 'View Expiry'
                  : 'Take Action'
                }
              </button>
            )}

            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead();
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Mark Read
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};