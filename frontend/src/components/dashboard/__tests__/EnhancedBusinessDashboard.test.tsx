/**
 * Enhanced Business Dashboard Tests
 * 
 * Tests for the updated dashboard with AudioTransactionCapture integration,
 * notification summaries, and quick access functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BusinessDashboard } from '../BusinessDashboard';
import { dashboardService } from '../../../services/DashboardService';
import { SimpleDemoService } from '../../../services/SimpleDemoService';
import { productRepository } from '../../../dbs/repo';
import { useDate } from '../../../contexts/DateContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useApp } from '../../../contexts/AppContext';

// Mock dependencies
vi.mock('../../../services/DashboardService');
vi.mock('../../../services/SimpleDemoService');
vi.mock('../../../dbs/repo');
vi.mock('../../../contexts/DateContext');
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../contexts/AppContext');
vi.mock('../../common/DateNavigator', () => ({
  DateNavigator: () => <div data-testid="date-navigator">Date Navigator</div>
}));
vi.mock('../../audio/AudioTransactionCapture', () => ({
  AudioTransactionCapture: ({ onTransactionCompleted, onError, className }: any) => (
    <div data-testid="audio-transaction-capture" className={className}>
      <button 
        onClick={() => onTransactionCompleted?.('test-transaction-id')}
        data-testid="complete-transaction-btn"
      >
        Complete Transaction
      </button>
      <button 
        onClick={() => onError?.('Test error')}
        data-testid="trigger-error-btn"
      >
        Trigger Error
      </button>
    </div>
  )
}));

const mockDashboardMetrics = {
  dailySales: {
    total: 1500,
    transactionCount: 12,
    averageTransaction: 125
  },
  topSellingProduct: {
    product: { id: '1', name: 'Test Product', price: 100 },
    quantitySold: 5,
    revenue: 500
  },
  lowStockAlerts: {
    count: 2,
    products: [
      { id: '1', name: 'Low Stock Item 1', stock: 2, reorderThreshold: 5 },
      { id: '2', name: 'Low Stock Item 2', stock: 1, reorderThreshold: 3 }
    ]
  },
  revenueChart: {
    dates: ['Jan 1', 'Jan 2', 'Jan 3'],
    amounts: [100, 200, 150]
  }
};

const mockNotifications = [
  {
    id: '1',
    type: 'low_stock' as const,
    title: 'Low Stock Alert',
    message: 'Product A is running low',
    priority: 'high' as const,
    timestamp: new Date(),
    read: false,
    actionable: true,
    data: { productId: '1' }
  },
  {
    id: '2',
    type: 'expired' as const,
    title: 'Product Expired',
    message: 'Product B has expired',
    priority: 'critical' as const,
    timestamp: new Date(),
    read: false,
    actionable: true,
    data: { productId: '2' }
  },
  {
    id: '3',
    type: 'transaction' as const,
    title: 'New Transaction',
    message: 'Sale completed',
    priority: 'low' as const,
    timestamp: new Date(),
    read: true,
    actionable: false,
    data: { transactionId: 'tx-1' }
  }
];

const mockAppState = {
  notifications: mockNotifications,
  unreadNotificationCount: 2,
  isInitialized: true,
  isFirstTime: false,
  currentShop: { id: '1', name: 'Test Shop' },
  currentPage: 'dashboard' as const,
  products: [],
  todaysTransactions: [],
  isListening: false,
  isProcessingAudio: false,
  pendingTransaction: null,
  loading: { app: false, data: false, audio: false },
  error: null,
  language: 'en' as const,
  autoSuggestEnabled: true
};

describe('Enhanced Business Dashboard', () => {
  const mockNavigateTo = vi.fn();
  const mockRefreshData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock hooks
    (useDate as any).mockReturnValue({
      selectedDate: new Date('2024-01-01')
    });
    
    (useAuth as any).mockReturnValue({
      user: { type: 'demo' }
    });
    
    (useApp as any).mockReturnValue({
      state: mockAppState,
      navigateTo: mockNavigateTo,
      refreshData: mockRefreshData
    });

    // Mock services
    (dashboardService.getAllMetrics as any).mockResolvedValue(mockDashboardMetrics);
    (SimpleDemoService.getTransactionsForDate as any).mockResolvedValue([
      { amount: 100, type: 'upi' },
      { amount: 200, type: 'cash' }
    ]);
    (productRepository.getAll as any).mockResolvedValue([]);
  });

  describe('Component Rendering', () => {
    it('should render dashboard with all sections', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });

      // Check for key metrics cards
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
      expect(screen.getByText('Top Product')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Avg. Transaction')).toBeInTheDocument();

      // Check for new sections
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should render AudioTransactionCapture component', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('audio-transaction-capture')).toBeInTheDocument();
      });
    });

    it('should display notification summary correctly', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Total notifications
        expect(screen.getByText('3')).toBeInTheDocument(); // Total count
        expect(screen.getByText('1')).toBeInTheDocument(); // Critical count
        expect(screen.getByText('2')).toBeInTheDocument(); // Actionable count
      });
    });

    it('should display critical notifications', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Product Expired')).toBeInTheDocument();
        expect(screen.getByText('Product B has expired')).toBeInTheDocument();
      });
    });

    it('should render quick action buttons', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });
    });
  });

  describe('AudioTransactionCapture Integration', () => {
    it('should handle transaction completion', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('complete-transaction-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('complete-transaction-btn'));

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });

    it('should handle audio transaction errors', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('trigger-error-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('trigger-error-btn'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });

    it('should apply correct styling to AudioTransactionCapture', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        const audioComponent = screen.getByTestId('audio-transaction-capture');
        expect(audioComponent).toHaveClass('border-0', 'shadow-none', 'p-0', 'bg-transparent');
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate to transactions page when clicking transaction logs', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Transaction Logs'));
      expect(mockNavigateTo).toHaveBeenCalledWith('transactions');
    });

    it('should navigate to inventory page when clicking inventory management', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Inventory Management'));
      expect(mockNavigateTo).toHaveBeenCalledWith('inventory');
    });

    it('should navigate to chat page when clicking AI assistant', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AI Assistant'));
      expect(mockNavigateTo).toHaveBeenCalledWith('chat');
    });
  });

  describe('Notification Summary', () => {
    it('should calculate notification counts correctly', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Check notification summary calculations
        const totalElement = screen.getByText('3');
        const criticalElement = screen.getByText('1');
        const actionableElement = screen.getByText('2');

        expect(totalElement).toBeInTheDocument();
        expect(criticalElement).toBeInTheDocument();
        expect(actionableElement).toBeInTheDocument();
      });
    });

    it('should show only critical unread notifications', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Should show the critical notification
        expect(screen.getByText('Product Expired')).toBeInTheDocument();
        
        // Should not show the low priority read notification
        expect(screen.queryByText('New Transaction')).not.toBeInTheDocument();
      });
    });

    it('should handle empty notifications gracefully', async () => {
      (useApp as any).mockReturnValue({
        state: { ...mockAppState, notifications: [] },
        navigateTo: mockNavigateTo,
        refreshData: mockRefreshData
      });

      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Total count should be 0
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should apply responsive grid classes', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        const notificationSection = screen.getByText('Notifications').closest('.bg-white');
        const quickActionsSection = screen.getByText('Quick Actions').closest('.bg-white');
        
        expect(notificationSection?.parentElement).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
        expect(quickActionsSection?.parentElement).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
      });
    });

    it('should maintain existing responsive classes for metrics cards', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        const metricsGrid = screen.getByText("Today's Sales").closest('.grid');
        expect(metricsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6');
      });
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when notifications change', async () => {
      const { rerender } = render(<BusinessDashboard />);

      // Update notifications
      const updatedState = {
        ...mockAppState,
        notifications: [...mockNotifications, {
          id: '4',
          type: 'low_stock' as const,
          title: 'New Alert',
          message: 'New low stock alert',
          priority: 'medium' as const,
          timestamp: new Date(),
          read: false,
          actionable: true,
          data: { productId: '3' }
        }]
      };

      (useApp as any).mockReturnValue({
        state: updatedState,
        navigateTo: mockNavigateTo,
        refreshData: mockRefreshData
      });

      rerender(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument(); // Updated total count
      });
    });

    it('should handle refresh button click', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(dashboardService.getAllMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when dashboard metrics fail to load', async () => {
      (dashboardService.getAllMetrics as any).mockRejectedValue(new Error('Failed to load metrics'));

      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
        expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (dashboardService.getAllMetrics as any).mockRejectedValue(new Error('Network error'));

      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry functionality
      (dashboardService.getAllMetrics as any).mockResolvedValue(mockDashboardMetrics);
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner initially', () => {
      render(<BusinessDashboard />);
      
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should hide loading spinner after data loads', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });
    });
  });
});