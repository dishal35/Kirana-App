import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessDashboard } from '../BusinessDashboard';
import { dashboardService } from '../../../services/DashboardService';
import type { DashboardMetrics } from '../../../services/DashboardService';

// Mock the dashboard service
vi.mock('../../../services/DashboardService', () => ({
  dashboardService: {
    getAllMetrics: vi.fn(),
  },
}));

describe('BusinessDashboard', () => {
  const mockMetrics: DashboardMetrics = {
    dailySales: {
      total: 1500,
      transactionCount: 10,
      averageTransaction: 150,
    },
    topSellingProduct: {
      product: {
        id: '1',
        name: 'Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 20,
        category: 'Grains',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      quantitySold: 25,
      revenue: 1250,
    },
    lowStockAlerts: {
      count: 2,
      products: [
        {
          id: '2',
          name: 'Dal',
          price: 80,
          stock: 5,
          reorderThreshold: 10,
          category: 'Pulses',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '3',
          name: 'Oil',
          price: 120,
          stock: 8,
          reorderThreshold: 15,
          category: 'Cooking',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
    },
    revenueChart: {
      dates: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7'],
      amounts: [100, 200, 150, 300, 250, 400, 1500],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(dashboardService.getAllMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BusinessDashboard />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should render dashboard metrics correctly', async () => {
    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    // Check daily sales
    expect(screen.getByText('Today\'s Sales')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
    expect(screen.getByText('10 transactions')).toBeInTheDocument();

    // Check top product
    expect(screen.getByText('Top Product')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('25 sold')).toBeInTheDocument();

    // Check low stock alerts
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Need attention')).toBeInTheDocument();

    // Check average transaction
    expect(screen.getByText('Avg. Transaction')).toBeInTheDocument();
    expect(screen.getByText('Per sale today')).toBeInTheDocument();
  });

  it('should render revenue trend chart', async () => {
    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('7-Day Revenue Trend')).toBeInTheDocument();
    });

    // Check if chart dates are rendered
    mockMetrics.revenueChart.dates.forEach(date => {
      expect(screen.getByText(date)).toBeInTheDocument();
    });
  });

  it('should render low stock alert section when there are alerts', async () => {
    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Check low stock products
    expect(screen.getByText('Dal')).toBeInTheDocument();
    expect(screen.getByText('Stock: 5 (Threshold: 10)')).toBeInTheDocument();
    expect(screen.getByText('Oil')).toBeInTheDocument();
    expect(screen.getByText('Stock: 8 (Threshold: 15)')).toBeInTheDocument();
  });

  it('should not render low stock alert section when no alerts', async () => {
    const metricsWithoutAlerts = {
      ...mockMetrics,
      lowStockAlerts: {
        count: 0,
        products: [],
      },
    };

    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(metricsWithoutAlerts);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Low Stock Alert')).not.toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('should handle no sales scenario', async () => {
    const noSalesMetrics: DashboardMetrics = {
      dailySales: {
        total: 0,
        transactionCount: 0,
        averageTransaction: 0,
      },
      topSellingProduct: {
        product: null,
        quantitySold: 0,
        revenue: 0,
      },
      lowStockAlerts: {
        count: 0,
        products: [],
      },
      revenueChart: {
        dates: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7'],
        amounts: [0, 0, 0, 0, 0, 0, 0],
      },
    };

    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(noSalesMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('0 transactions')).toBeInTheDocument();
    expect(screen.getByText('No sales yet')).toBeInTheDocument();
    expect(screen.getByText('Start selling today')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    const errorMessage = 'Failed to load metrics';
    vi.mocked(dashboardService.getAllMetrics).mockRejectedValue(new Error(errorMessage));

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should refresh data when refresh button is clicked', async () => {
    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(vi.mocked(dashboardService.getAllMetrics)).toHaveBeenCalledTimes(2);
  });

  it('should retry loading data when retry button is clicked in error state', async () => {
    vi.mocked(dashboardService.getAllMetrics)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    expect(vi.mocked(dashboardService.getAllMetrics)).toHaveBeenCalledTimes(2);
  });

  it('should format currency correctly', async () => {
    const metricsWithLargeAmount = {
      ...mockMetrics,
      dailySales: {
        ...mockMetrics.dailySales,
        total: 123456,
        averageTransaction: 12345,
      },
    };

    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(metricsWithLargeAmount);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
    });

    // Check that large amounts are formatted correctly in the main cards
    const salesCards = screen.getAllByText(/₹1,23,456|₹12,345/);
    expect(salesCards.length).toBeGreaterThan(0);
  });

  it('should show last updated time', async () => {
    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(mockMetrics);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('should handle products with images in low stock alerts', async () => {
    const metricsWithImages = {
      ...mockMetrics,
      lowStockAlerts: {
        count: 1,
        products: [
          {
            ...mockMetrics.lowStockAlerts.products[0],
            imageUrl: 'https://example.com/dal.jpg',
          },
        ],
      },
    };

    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(metricsWithImages);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    const productImage = screen.getByAltText('Dal');
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute('src', 'https://example.com/dal.jpg');
  });

  it('should show truncated message for many low stock products', async () => {
    const manyLowStockProducts = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Product ${i + 1}`,
      price: 100,
      stock: 1,
      reorderThreshold: 5,
      category: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const metricsWithManyAlerts = {
      ...mockMetrics,
      lowStockAlerts: {
        count: 10,
        products: manyLowStockProducts,
      },
    };

    vi.mocked(dashboardService.getAllMetrics).mockResolvedValue(metricsWithManyAlerts);

    render(<BusinessDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });

    // Should show only first 6 products
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 6')).toBeInTheDocument();
    expect(screen.queryByText('Product 7')).not.toBeInTheDocument();

    // Should show truncation message
    expect(screen.getByText('And 4 more products need restocking')).toBeInTheDocument();
  });
});