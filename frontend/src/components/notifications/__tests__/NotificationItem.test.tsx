import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationItem } from '../NotificationItem';
import { Notification } from '../../../types';

describe('NotificationItem', () => {
  const mockOnAction = vi.fn();

  const baseNotification: Notification = {
    id: '1',
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'Product A is running low (5 remaining)',
    priority: 'high',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    read: false,
    actionable: true,
    data: { productId: 'prod1', productName: 'Product A' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log for quick action testing
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders notification content correctly', () => {
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    expect(screen.getByText('Product A is running low (5 remaining)')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('displays correct icon for different notification types', () => {
    const notifications = [
      { ...baseNotification, type: 'low_stock' as const },
      { ...baseNotification, type: 'expiry_warning' as const },
      { ...baseNotification, type: 'transaction' as const },
      { ...baseNotification, type: 'reorder' as const }
    ];

    notifications.forEach((notification, index) => {
      const { container, unmount } = render(<NotificationItem notification={notification} onAction={mockOnAction} />);
      
      // Each notification type should have its specific icon (SVG)
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      
      unmount();
    });
  });

  it('applies correct priority styling', () => {
    const priorities: Array<{ priority: Notification['priority'], expectedClass: string }> = [
      { priority: 'critical', expectedClass: 'border-red-500' },
      { priority: 'high', expectedClass: 'border-orange-500' },
      { priority: 'medium', expectedClass: 'border-yellow-500' },
      { priority: 'low', expectedClass: 'border-blue-500' }
    ];

    priorities.forEach(({ priority, expectedClass }) => {
      const notification = { ...baseNotification, priority };
      const { container, unmount } = render(<NotificationItem notification={notification} onAction={mockOnAction} />);
      
      expect(container.firstChild).toHaveClass(expectedClass);
      
      unmount();
    });
  });

  it('shows unread indicator for unread notifications', () => {
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    // Unread indicator (blue dot) - look for the specific element with blue background
    const unreadIndicator = screen.getByTestId('unread-indicator');
    expect(unreadIndicator).toHaveClass('bg-blue-500', 'rounded-full');
  });

  it('does not show unread indicator for read notifications', () => {
    const readNotification = { ...baseNotification, read: true };
    render(<NotificationItem notification={readNotification} onAction={mockOnAction} />);

    // Should not have unread indicator
    expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument();
  });

  it('displays action buttons for actionable notifications', () => {
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    expect(screen.getByText('Manage Stock')).toBeInTheDocument();
    expect(screen.getByText('Mark Read')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows correct action text for different notification types', () => {
    const actionableNotifications = [
      { ...baseNotification, type: 'low_stock' as const, expectedAction: 'Manage Stock' },
      { ...baseNotification, type: 'expiry_warning' as const, expectedAction: 'View Expiry' },
      { ...baseNotification, type: 'reorder' as const, expectedAction: 'Take Action' }
    ];

    actionableNotifications.forEach(({ expectedAction, ...notification }) => {
      const { unmount } = render(<NotificationItem notification={notification} onAction={mockOnAction} />);
      
      expect(screen.getByText(expectedAction)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('does not show action button for non-actionable notifications', () => {
    const nonActionableNotification = { ...baseNotification, actionable: false };
    render(<NotificationItem notification={nonActionableNotification} onAction={mockOnAction} />);

    expect(screen.queryByText('Manage Stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Take Action')).not.toBeInTheDocument();
  });

  it('does not show mark read button for already read notifications', () => {
    const readNotification = { ...baseNotification, read: true };
    render(<NotificationItem notification={readNotification} onAction={mockOnAction} />);

    expect(screen.queryByText('Mark Read')).not.toBeInTheDocument();
  });

  it('calls onAction with mark_read when mark read is clicked', () => {
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    fireEvent.click(screen.getByText('Mark Read'));

    expect(mockOnAction).toHaveBeenCalledWith('1', 'mark_read');
  });

  it('calls onAction with delete when delete is clicked', () => {
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    fireEvent.click(screen.getByText('Delete'));

    expect(mockOnAction).toHaveBeenCalledWith('1', 'delete');
  });

  it('marks as read when notification is clicked', () => {
    const { container } = render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    fireEvent.click(container.firstChild as Element);

    expect(mockOnAction).toHaveBeenCalledWith('1', 'mark_read');
  });

  it('does not mark as read when already read notification is clicked', () => {
    const readNotification = { ...baseNotification, read: true };
    const { container } = render(<NotificationItem notification={readNotification} onAction={mockOnAction} />);

    fireEvent.click(container.firstChild as Element);

    expect(mockOnAction).not.toHaveBeenCalled();
  });

  it('handles quick action clicks', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);

    fireEvent.click(screen.getByText('Manage Stock'));

    expect(consoleSpy).toHaveBeenCalledWith('Navigate to inventory for product:', 'prod1');
  });

  it('prevents event bubbling on action button clicks', () => {
    const { container } = render(<NotificationItem notification={baseNotification} onAction={mockOnAction} />);
    
    const markReadButton = screen.getByText('Mark Read');
    const deleteButton = screen.getByText('Delete');
    const actionButton = screen.getByText('Manage Stock');

    // Click action buttons - should not trigger the container click
    fireEvent.click(markReadButton);
    fireEvent.click(deleteButton);
    fireEvent.click(actionButton);

    // Should only be called once for mark read, not for container clicks
    expect(mockOnAction).toHaveBeenCalledTimes(2); // mark read + delete
  });

  it('formats timestamp correctly', () => {
    const now = new Date();
    const timestamps = [
      { timestamp: new Date(now.getTime() - 30 * 1000), expected: 'Just now' },
      { timestamp: new Date(now.getTime() - 5 * 60 * 1000), expected: '5m ago' },
      { timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), expected: '2h ago' },
      { timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), expected: '3d ago' }
    ];

    timestamps.forEach(({ timestamp, expected }) => {
      const notification = { ...baseNotification, timestamp };
      const { unmount } = render(<NotificationItem notification={notification} onAction={mockOnAction} />);
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('handles notifications without id gracefully', () => {
    const notificationWithoutId = { ...baseNotification, id: undefined };
    render(<NotificationItem notification={notificationWithoutId} onAction={mockOnAction} />);

    // Should render without errors
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();

    // Action buttons should not call onAction when id is missing
    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnAction).not.toHaveBeenCalled();
  });
});