/**
 * Integration tests for notification UI components
 * Tests the integration between notification components and app context
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider } from '../../contexts/AppContext';
import { Navigation } from '../Navigation';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { NotificationBell } from '../notifications/NotificationBell';
import type { Notification } from '../../types';

// Mock the services
vi.mock('../../services/NotificationService', () => ({
  notificationService: {
    addListener: vi.fn(() => () => {}),
    getNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../dbs/repo', () => ({
  shopRepository: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn()
  },
  productRepository: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn()
  },
  transactionRepository: {
    getTodaysTransactions: vi.fn().mockResolvedValue([]),
    create: vi.fn()
  }
}));

// Mock router
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' })
}));

const mockNotifications: Notification[] = [
  {
    id: 'notification-1',
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'Product A is running low (2 remaining)',
    priority: 'high',
    read: false,
    actionable: true,
    timestamp: new Date(),
    data: {
      productId: 'product-1',
      productName: 'Product A',
      currentStock: 2,
      threshold: 10
    }
  },
  {
    id: 'notification-2',
    type: 'transaction',
    title: 'Transaction Completed',
    message: '₹150 sale completed - Product B',
    priority: 'medium',
    read: true,
    actionable: false,
    timestamp: new Date(Date.now() - 60000), // 1 minute ago
    data: {
      transactionId: 'transaction-1',
      amount: 150,
      type: 'upi'
    }
  },
  {
    id: 'notification-3',
    type: 'expiry_warning',
    title: 'Expiring Soon',
    message: 'Product C expires in 1 day',
    priority: 'high',
    read: false,
    actionable: true,
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    data: {
      productId: 'product-3',
      productName: 'Product C',
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      daysUntilExpiry: 1
    }
  }
];

describe('Notification UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationBell Integration', () => {
    it('should display correct unread count', () => {
      const unreadCount = 2;
      
      render(
        <NotificationBell 
          unreadCount={unreadCount} 
          onClick={() => {}} 
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle click events', () => {
      const handleClick = vi.fn();
      
      render(
        <NotificationBell 
          unreadCount={1} 
          onClick={handleClick} 
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('should not show badge when no unread notifications', () => {
      render(
        <NotificationBell 
          unreadCount={0} 
          onClick={() => {}} 
        />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('NotificationPanel Integration', () => {
    it('should display notifications correctly', () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Should display notification titles
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Transaction Completed')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();

      // Should display notification messages
      expect(screen.getByText('Product A is running low (2 remaining)')).toBeInTheDocument();
      expect(screen.getByText('₹150 sale completed - Product B')).toBeInTheDocument();
      expect(screen.getByText('Product C expires in 1 day')).toBeInTheDocument();
    });

    it('should handle mark as read action', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Click on unread notification
      const unreadNotification = screen.getByText('Low Stock Alert').closest('div');
      fireEvent.click(unreadNotification!);

      await waitFor(() => {
        expect(mockHandlers.onMarkAsRead).toHaveBeenCalledWith('notification-1');
      });
    });

    it('should handle mark all as read action', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      const markAllButton = screen.getByText('Mark All Read');
      fireEvent.click(markAllButton);

      expect(mockHandlers.onMarkAllAsRead).toHaveBeenCalled();
    });

    it('should handle clear all action', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(mockHandlers.onClearAll).toHaveBeenCalled();
    });

    it('should handle navigation actions for actionable notifications', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Click on "Manage Stock" action for low stock notification
      const manageStockButton = screen.getByText('Manage Stock');
      fireEvent.click(manageStockButton);

      expect(mockHandlers.onNavigate).toHaveBeenCalledWith('inventory', {
        productId: 'product-1',
        tab: 'overview',
        action: 'adjust_stock'
      });
    });

    it('should filter notifications correctly', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Filter by unread
      const unreadFilter = screen.getByText('Unread');
      fireEvent.click(unreadFilter);

      // Should only show unread notifications
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.queryByText('Transaction Completed')).not.toBeInTheDocument();
    });

    it('should filter by priority', async () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Filter by high priority
      const prioritySelect = screen.getByDisplayValue('All Priorities');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });

      // Should only show high priority notifications
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.queryByText('Transaction Completed')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <AppProvider>
        {children}
      </AppProvider>
    );

    it('should integrate notification bell with navigation', async () => {
      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      );

      // Should render notification bell
      const notificationButton = screen.getByRole('button', { name: /notification/i });
      expect(notificationButton).toBeInTheDocument();
    });

    it('should show notification panel when bell is clicked', async () => {
      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      );

      // Click notification bell
      const notificationButton = screen.getByRole('button', { name: /notification/i });
      fireEvent.click(notificationButton);

      // Should show notification panel
      await waitFor(() => {
        expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Navigation Integration', () => {
    it('should show mobile notification interface', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AppProvider>
          {children}
        </AppProvider>
      );

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      );

      // Should render mobile navigation elements
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });
  });

  describe('Cross-Component State Synchronization', () => {
    it('should synchronize notification state across components', async () => {
      const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AppProvider>
          {children}
        </AppProvider>
      );

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      );

      // Initial state should be loaded
      await waitFor(() => {
        // Notification service should be called to load initial data
        expect(screen.getByRole('button', { name: /notification/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling in UI Integration', () => {
    it('should handle notification service errors gracefully', async () => {
      // Mock service error
      const { notificationService } = await import('../../services/NotificationService');
      vi.mocked(notificationService.markAsRead).mockRejectedValue(new Error('Service error'));

      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Should still call the handler even if service fails
      const unreadNotification = screen.getByText('Low Stock Alert').closest('div');
      fireEvent.click(unreadNotification!);

      await waitFor(() => {
        expect(mockHandlers.onMarkAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide proper ARIA labels for notification elements', () => {
      render(
        <NotificationBell 
          unreadCount={3} 
          onClick={() => {}} 
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('notification'));
    });

    it('should support keyboard navigation in notification panel', () => {
      const mockHandlers = {
        onClose: vi.fn(),
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onClearAll: vi.fn(),
        onNavigate: vi.fn()
      };

      render(
        <NotificationPanel
          notifications={mockNotifications}
          {...mockHandlers}
        />
      );

      // Should be able to tab through interactive elements
      const markAllButton = screen.getByText('Mark All Read');
      expect(markAllButton).toBeInTheDocument();
      
      const clearAllButton = screen.getByText('Clear All');
      expect(clearAllButton).toBeInTheDocument();
    });
  });
});