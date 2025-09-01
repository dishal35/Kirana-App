import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationBell } from '../NotificationBell';
import { notificationService } from '../../../services/NotificationService';

// Mock the notification service
vi.mock('../../../services/NotificationService', () => ({
  notificationService: {
    getUnreadCount: vi.fn(),
    addListener: vi.fn()
  }
}));

const mockNotificationService = notificationService as any;

describe('NotificationBell', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationService.addListener.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification bell icon', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    render(<NotificationBell onClick={mockOnClick} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('displays unread count badge when there are unread notifications', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(5);

    render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Notifications (5 unread)')).toBeInTheDocument();
  });

  it('displays 99+ for counts over 99', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(150);

    render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('does not display badge when count is 0', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('calls onClick when clicked', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state initially', () => {
    mockNotificationService.getUnreadCount.mockImplementation(() => new Promise(() => {}));

    render(<NotificationBell onClick={mockOnClick} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('updates count when notifications change', async () => {
    let listenerCallback: ((notifications: any[]) => void) | null = null;
    
    mockNotificationService.getUnreadCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);
    
    mockNotificationService.addListener.mockImplementation((callback) => {
      listenerCallback = callback;
      return () => {};
    });

    render(<NotificationBell onClick={mockOnClick} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Simulate notification change
    if (listenerCallback) {
      listenerCallback([]);
    }

    // Wait for count update
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('handles service errors gracefully', async () => {
    mockNotificationService.getUnreadCount.mockRejectedValue(new Error('Service error'));

    render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    // Should not show any count badge on error
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('applies custom className', async () => {
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    render(<NotificationBell onClick={mockOnClick} className="custom-class" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  it('unsubscribes from notifications on unmount', async () => {
    const mockUnsubscribe = vi.fn();
    mockNotificationService.addListener.mockReturnValue(mockUnsubscribe);
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    const { unmount } = render(<NotificationBell onClick={mockOnClick} />);

    await waitFor(() => {
      expect(mockNotificationService.addListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});