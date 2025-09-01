/**
 * Dashboard Integration Test
 * 
 * Simple integration test to verify the enhanced dashboard functionality
 * without complex assertions that might conflict with existing UI elements.
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
      <h3>Voice Transaction Capture</h3>
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

describe('Dashboard Integration', () => {
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

  describe('Enhanced Features Integration', () => {
    it('should render all enhanced dashboard sections', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Check main dashboard title
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
        
        // Check AudioTransactionCapture integration
        expect(screen.getByTestId('audio-transaction-capture')).toBeInTheDocument();
        expect(screen.getByText('Voice Transaction Capture')).toBeInTheDocument();
        
        // Check notification section
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        
        // Check quick actions section
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
        expect(screen.getByText('Inventory Management')).toBeInTheDocument();
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });
    });

    it('should handle AudioTransactionCapture completion', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('complete-transaction-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('complete-transaction-btn'));

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });

    it('should handle AudioTransactionCapture errors', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('trigger-error-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('trigger-error-btn'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });

    it('should navigate when clicking quick action buttons', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
      });

      // Test transaction logs navigation
      fireEvent.click(screen.getByText('Transaction Logs'));
      expect(mockNavigateTo).toHaveBeenCalledWith('transactions');

      // Test inventory management navigation
      fireEvent.click(screen.getByText('Inventory Management'));
      expect(mockNavigateTo).toHaveBeenCalledWith('inventory');

      // Test AI assistant navigation
      fireEvent.click(screen.getByText('AI Assistant'));
      expect(mockNavigateTo).toHaveBeenCalledWith('chat');
    });

    it('should display critical notifications', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Check for critical notification display
        expect(screen.getByText('Product Expired')).toBeInTheDocument();
        expect(screen.getByText('Product B has expired')).toBeInTheDocument();
      });
    });

    it('should apply correct styling to AudioTransactionCapture', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        const audioComponent = screen.getByTestId('audio-transaction-capture');
        expect(audioComponent).toHaveClass('border-0', 'shadow-none', 'p-0', 'bg-transparent');
      });
    });

    it('should show notification summary sections', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Check notification summary labels
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByText('Actionable')).toBeInTheDocument();
      });
    });

    it('should handle refresh functionality', async () => {
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

  describe('Responsive Layout', () => {
    it('should have responsive grid classes', async () => {
      render(<BusinessDashboard />);

      await waitFor(() => {
        // Check for grid containers
        const gridContainers = document.querySelectorAll('.grid');
        expect(gridContainers.length).toBeGreaterThan(0);
        
        // Check for responsive classes
        const responsiveElements = document.querySelectorAll('.lg\\:grid-cols-2, .md\\:grid-cols-2, .lg\\:grid-cols-4');
        expect(responsiveElements.length).toBeGreaterThan(0);
      });
    });
  });
});