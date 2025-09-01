import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/NotificationService';
import type { Notification, NotificationFilters } from '../../types';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigate?: (page: string, params?: any) => void;
  className?: string;
  isMobile?: boolean;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigate,
  className = '',
  isMobile = false
}) => {
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'actionable'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Notification['priority'] | 'all'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (!isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose, isMobile]);

  // Apply filters whenever notifications or filter settings change
  useEffect(() => {
    let filtered = [...notifications];

    // Apply read/unread filter
    if (activeFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (activeFilter === 'actionable') {
      filtered = filtered.filter(n => n.actionable);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    setFilteredNotifications(filtered);
  }, [notifications, activeFilter, priorityFilter]);

  const handleNotificationAction = async (notificationId: string, action: string) => {
    try {
      if (action === 'mark_read') {
        onMarkAsRead(notificationId);
      } else if (action === 'delete') {
        await notificationService.deleteNotification(notificationId);
      }
    } catch (error) {
      console.error('Failed to perform notification action:', error);
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'fixed inset-0 z-50 lg:relative lg:inset-auto'}`}>
      {/* Backdrop for mobile */}
      {isMobile && <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />}
      
      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="notification-panel"
        className={`
          ${isMobile 
            ? 'w-full bg-white rounded-t-lg' 
            : 'fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl lg:absolute lg:right-0 lg:top-full lg:mt-2 lg:h-auto lg:max-h-96 lg:rounded-lg lg:border'
          }
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 lg:rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Close notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'unread'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setActiveFilter('actionable')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'actionable'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Actionable
            </button>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Notification['priority'] | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-b bg-gray-50">
          <button
            onClick={onMarkAllAsRead}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            disabled={notifications.filter(n => !n.read).length === 0}
          >
            Mark All Read
          </button>
          <button
            onClick={onClearAll}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            disabled={notifications.length === 0}
          >
            Clear All
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-80 lg:max-h-64">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onAction={handleNotificationAction}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};