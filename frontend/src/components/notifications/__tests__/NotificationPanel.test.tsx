import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationPanel } from '../NotificationPanel';
import { notificationService } from '../../../services/NotificationService';
import { Notification } from '../../../types';

// Mock the notification service
vi.mock('../../../services/NotificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
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
    read: true,
    actionable: false,
    data: { transactionId: 'txn1' }
  },
  {
    id: '3',
    type: 'expired',
    title: 'Product Expired',
    message: 'Product B has expired',
    priority: 'critical',
    timestamp: new Date('2024-01-01T08:00:00Z'),
    read: false,
    actionable: true,
    data: { productId: 'prod2' }
  }
];

describe('NotificationPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationService.addListener.mockReturnValue(() => {});
    mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
    mockNotificationService.markAllAsRead.mockResolvedValue(undefined);
    mockNotificationService.clearAll.mockResolvedValue(undefined);
    mockNotificationService.markAsRead.mockResolvedValue(undefined);
    mockNotificationService.deleteNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(<NotificationPanel isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('renders when open and loads notifications', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Transaction Completed')).toBeInTheDocument();
      expect(screen.getByText('Product Expired')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockNotificationService.getNotifications.mockImplementation(() => new Promise(() => {}));
    
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    mockNotificationService.getNotifications.mockResolvedValue([]);
    
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  it('filters notifications by read status', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Click unread filter
    fireEvent.click(screen.getByText('Unread'));

    // Should only show unread notifications
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    expect(screen.getByText('Product Expired')).toBeInTheDocument();
    expect(screen.queryByText('Transaction Completed')).not.toBeInTheDocument();
  });

  it('filters notifications by actionable status', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Click actionable filter
    fireEvent.click(screen.getByText('Actionable'));

    // Should only show actionable notifications
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    expect(screen.getByText('Product Expired')).toBeInTheDocument();
    expect(screen.queryByText('Transaction Completed')).not.toBeInTheDocument();
  });

  it('filters notifications by priority', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Select critical priority filter
    const prioritySelect = screen.getByDisplayValue('All Priorities');
    fireEvent.change(prioritySelect, { target: { value: 'critical' } });

    // Should only show critical notifications
    expect(screen.queryByText('Low Stock Alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaction Completed')).not.toBeInTheDocument();
    expect(screen.getByText('Product Expired')).toBeInTheDocument();
  });

  it('marks all notifications as read', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark All Read'));

    expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('clears all notifications', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear All'));

    expect(mockNotificationService.clearAll).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons when no notifications', async () => {
    mockNotificationService.getNotifications.mockResolvedValue([]);
    
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeDisabled();
    });
  });

  it('disables mark all read when no unread notifications', async () => {
    const readNotifications = mockNotifications.map(n => ({ ...n, read: true }));
    mockNotificationService.getNotifications.mockResolvedValue(readNotifications);
    
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Mark All Read')).toBeDisabled();
    });
  });

  it('closes panel when close button is clicked', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close notifications');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles notification actions', async () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Find and click mark as read button for first notification
    const markReadButtons = screen.getAllByText('Mark Read');
    fireEvent.click(markReadButtons[0]);

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1');
  });

  it('handles service errors gracefully', async () => {
    mockNotificationService.getNotifications.mockRejectedValue(new Error('Service error'));
    
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  it('updates notifications when service notifies changes', async () => {
    let listenerCallback: ((notifications: Notification[]) => void) | null = null;
    
    mockNotificationService.addListener.mockImplementation((callback) => {
      listenerCallback = callback;
      return () => {};
    });

    render(<NotificationPanel isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Simulate notification change
    const updatedNotifications = [...mockNotifications, {
      id: '4',
      type: 'reorder',
      title: 'Reorder Required',
      message: 'Time to reorder Product C',
      priority: 'medium',
      timestamp: new Date(),
      read: false,
      actionable: true
    }];

    mockNotificationService.getNotifications.mockResolvedValue(updatedNotifications);

    if (listenerCallback) {
      listenerCallback(updatedNotifications);
    }

    await waitFor(() => {
      expect(screen.getByText('Reorder Required')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<NotificationPanel isOpen={true} onClose={mockOnClose} className="custom-class" />);

    const panel = screen.getByTestId('notification-panel');
    expect(panel).toHaveClass('custom-class');
  });
});