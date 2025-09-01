import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/NotificationService';

interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  onClick, 
  className = '' 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        if (mounted) {
          setUnreadCount(count);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial load
    loadUnreadCount();

    // Subscribe to notification changes
    const unsubscribe = notificationService.addListener(async () => {
      if (mounted) {
        await loadUnreadCount();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleClick = () => {
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      disabled={isLoading}
    >
      {/* Bell Icon */}
      <svg
        className="w-6 h-6 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
    </button>
  );
};