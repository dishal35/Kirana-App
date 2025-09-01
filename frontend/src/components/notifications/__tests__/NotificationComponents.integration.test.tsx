import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationBell } from '../NotificationBell';
import { NotificationPanel } from '../NotificationPanel';
import { notificationService } from '../../../services/NotificationService';
import { Notification } from '../../../types';

// Mock the notification service
vi.mock('../../../services/NotificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAllAsRead: vi.fn(),
    clearAll: vi.fn(),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    addListener: vi.fn()
  }
}));

const mockNotificationService = notificationService as any;

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'Product A is running low',
    priority: 'high',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    read: false,
    actionable: true,
    data: { productId: 'prod1' }
  },
  {
    id: '2',
    type: 'transaction',
    title: 'Transaction Completed',
    message: '₹100 sale completed',
    priority: 'medium',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    read: false,
    actionable: false,
    data: { transactionId: 'txn1' }
  }
];

// Test component that combines bell and panel
const NotificationTestComponent: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div>
      <NotificationBell onClick={() => setIsPanelOpen(true)} />
      <NotificationPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </div>
  );
};

describe('Notification Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationService.addListener.mockReturnValue(() => {});
    mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
    mockNotificationService.getUnreadCount.mockResolvedValue(2);
    mockNotificationService.markAllAsRead.mockResolvedValue(undefined);
    mockNotificationService.clearAll.mockResolvedValue(undefined);
    mockNotificationService.markAsRead.mockResolvedValue(undefined);
    mockNotificationService.deleteNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens notification panel when bell is clicked', async () => {
    render(<NotificationTestComponent />);

    // Wait for bell to load
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Panel should not be visible initially
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

    // Click the bell
    fireEvent.click(screen.getByRole('button'));

    // Panel should now be visible
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('closes notification panel when close button is clicked', async () => {
    render(<NotificationTestComponent />);

    // Open panel
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button'));

    // Panel should be visible
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // Close panel
    fireEvent.click(screen.getByLabelText('Close notifications'));

    // Panel should be hidden
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('updates bell count when notifications are marked as read', async () => {
    render(<NotificationTestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Open panel
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Mark all as read
    fireEvent.click(screen.getByText('Mark All Read'));

    // Verify the service was called
    expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
  });

  it('updates panel content when individual notification is marked as read', async () => {
    render(<NotificationTestComponent />);

    // Open panel
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Mark first notification as read
    const markReadButtons = screen.getAllByText('Mark Read');
    fireEvent.click(markReadButtons[0]);

    // Verify the service was called
    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1');
  });

  it('handles clearing all notifications', async () => {
    let listenerCallback: ((notifications: Notification[]) => void) | null = null;
    
    mockNotificationService.addListener.mockImplementation((callback) => {
      listenerCallback = callback;
      return () => {};
    });

    render(<NotificationTestComponent />);

    // Open panel
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Clear all notifications
    fireEvent.click(screen.getByText('Clear All'));

    // Simulate service response - no notifications
    mockNotificationService.getUnreadCount.mockResolvedValue(0);
    mockNotificationService.getNotifications.mockResolvedValue([]);
    
    if (listenerCallback) {
      listenerCallback([]);
    }

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });

    // Verify clear all was called
    expect(mockNotificationService.clearAll).toHaveBeenCalled();
  });

  it('maintains panel state when bell count updates', async () => {
    let listenerCallback: ((notifications: Notification[]) => void) | null = null;
    
    mockNotificationService.addListener.mockImplementation((callback) => {
      listenerCallback = callback;
      return () => {};
    });

    render(<NotificationTestComponent />);

    // Open panel
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Apply unread filter
    fireEvent.click(screen.getByText('Unread'));

    // Simulate new notification added
    const newNotification: Notification = {
      id: '3',
      type: 'expiry_warning',
      title: 'Product Expiring',
      message: 'Product C expires soon',
      priority: 'high',
      timestamp: new Date(),
      read: false,
      actionable: true
    };

    mockNotificationService.getUnreadCount.mockResolvedValue(3);
    const updatedNotifications = [...mockNotifications, newNotification];
    
    if (listenerCallback) {
      listenerCallback(updatedNotifications);
    }

    // Verify the panel is still open and filter is active
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toHaveClass('bg-blue-500');
  });

  it('handles service errors gracefully in both components', async () => {
    mockNotificationService.getUnreadCount.mockRejectedValue(new Error('Service error'));
    mockNotificationService.getNotifications.mockRejectedValue(new Error('Service error'));

    render(<NotificationTestComponent />);

    // Bell should handle error gracefully
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    // Should not show count badge on error
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();

    // Open panel
    fireEvent.click(screen.getByRole('button'));

    // Panel should show empty state on error
    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  it('synchronizes listeners between components', async () => {
    const listeners: Array<(notifications: Notification[]) => void> = [];
    
    mockNotificationService.addListener.mockImplementation((callback) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    });

    const { unmount } = render(<NotificationTestComponent />);

    // Bell should register listener initially
    expect(mockNotificationService.addListener).toHaveBeenCalled();

    // Unmount should clean up listeners
    unmount();

    // All listeners should be removed
    expect(listeners).toHaveLength(0);
  });
});