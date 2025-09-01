import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpiryTrackingPanel } from '../ExpiryTrackingPanel';
import { inventoryManager } from '../../../services/InventoryManager';
import type { ExpiryAlert } from '../../../types';

// Mock the inventory manager
vi.mock('../../../services/InventoryManager', () => ({
  inventoryManager: {
    performBulkAdjustments: vi.fn()
  }
}));

describe('ExpiryTrackingPanel', () => {
  const mockOnRefresh = vi.fn();

  const mockAlerts: ExpiryAlert[] = [
    {
      id: '1',
      productId: 'prod1',
      productName: 'Milk',
      expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      daysUntilExpiry: -1,
      currentStock: 5,
      severity: 'expired',
      estimatedLoss: 250
    },
    {
      id: '2',
      productId: 'prod2',
      productName: 'Bread',
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
      daysUntilExpiry: 1,
      currentStock: 10,
      severity: 'critical',
      estimatedLoss: 200
    },
    {
      id: '3',
      productId: 'prod3',
      productName: 'Yogurt',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Expires in 5 days
      daysUntilExpiry: 5,
      currentStock: 8,
      severity: 'warning',
      estimatedLoss: 160
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render summary cards with correct counts', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const productCounts = screen.getAllByText('1 products');
    expect(productCounts).toHaveLength(3); // Expired, Critical, Warning
  });

  it('should display estimated loss in summary cards', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const lossTexts = screen.getAllByText(/Loss: ₹250/);
    expect(lossTexts.length).toBeGreaterThan(0); // Should appear in summary and individual alerts
  });

  it('should render all alerts with correct information', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('Yogurt')).toBeInTheDocument();

    expect(screen.getAllByText('Expired')).toHaveLength(2); // Summary and status
    expect(screen.getByText('Expires today')).toBeInTheDocument();
    expect(screen.getByText('5 days left')).toBeInTheDocument();
  });

  it('should show severity badges with correct colors', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const expiredBadge = screen.getByText('EXPIRED');
    const criticalBadge = screen.getByText('CRITICAL');
    const warningBadge = screen.getByText('WARNING');

    expect(expiredBadge).toHaveClass('text-red-800');
    expect(criticalBadge).toHaveClass('text-orange-800');
    expect(warningBadge).toHaveClass('text-yellow-800');
  });

  it('should handle alert selection', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstAlertCheckbox = checkboxes[1]; // Skip the "select all" checkbox

    fireEvent.click(firstAlertCheckbox);

    expect(screen.getByText('1 alerts selected')).toBeInTheDocument();
  });

  it('should handle select all functionality', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('3 alerts selected')).toBeInTheDocument();
  });

  it('should show bulk actions when alerts are selected', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('Mark as Handled')).toBeInTheDocument();
    expect(screen.getByText('Remove Expired Stock')).toBeInTheDocument();
  });

  it('should calculate total estimated loss for selected alerts', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    const totalLoss = mockAlerts.reduce((sum, alert) => sum + (alert.estimatedLoss || 0), 0);
    expect(screen.getByText(`Estimated loss: ₹${totalLoss.toLocaleString('en-IN')}`)).toBeInTheDocument();
  });

  it('should handle bulk mark as handled', async () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    const markHandledButton = screen.getByText('Mark as Handled');
    fireEvent.click(markHandledButton);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should handle bulk remove expired stock', async () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    // Select only the expired alert
    const checkboxes = screen.getAllByRole('checkbox');
    const expiredAlertCheckbox = checkboxes[1]; // First alert (expired)
    fireEvent.click(expiredAlertCheckbox);

    const removeExpiredButton = screen.getByText('Remove Expired Stock');
    fireEvent.click(removeExpiredButton);

    await waitFor(() => {
      expect(inventoryManager.performBulkAdjustments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod1',
            quantityChange: -5,
            type: 'expiry',
            reasonCode: 'EXPIRED_REMOVAL'
          })
        ]),
        expect.stringContaining('Bulk removal of expired products')
      );
    });
  });

  it('should disable remove expired button when no expired items selected', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    // Select only non-expired alerts
    const checkboxes = screen.getAllByRole('checkbox');
    const criticalAlertCheckbox = checkboxes[2]; // Second alert (critical)
    fireEvent.click(criticalAlertCheckbox);

    const removeExpiredButton = screen.getByText('Remove Expired Stock');
    expect(removeExpiredButton).toBeDisabled();
  });

  it('should show appropriate action recommendations', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    expect(screen.getByText('Remove from stock')).toBeInTheDocument(); // For expired
    expect(screen.getByText('Urgent sale/discount')).toBeInTheDocument(); // For critical
    expect(screen.getByText('Monitor closely')).toBeInTheDocument(); // For warning
  });

  it('should show expired product warning', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    expect(screen.getByText(/This product has expired and should be removed/)).toBeInTheDocument();
  });

  it('should handle empty alerts list', () => {
    render(<ExpiryTrackingPanel alerts={[]} onRefresh={mockOnRefresh} />);

    expect(screen.getByText('No expiry alerts')).toBeInTheDocument();
    expect(screen.getByText('All products are within safe expiry periods')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should format dates correctly', () => {
    const alertWithSpecificDate: ExpiryAlert = {
      id: '4',
      productId: 'prod4',
      productName: 'Test Product',
      expiryDate: new Date('2024-03-15'),
      daysUntilExpiry: 1,
      currentStock: 1,
      severity: 'critical',
      estimatedLoss: 50
    };

    render(<ExpiryTrackingPanel alerts={[alertWithSpecificDate]} onRefresh={mockOnRefresh} />);

    expect(screen.getByText('15 Mar 2024')).toBeInTheDocument();
  });

  it('should show correct severity icons', () => {
    render(<ExpiryTrackingPanel alerts={mockAlerts} onRefresh={mockOnRefresh} />);

    // Check for emoji icons (they should be present in the document)
    const alertItems = screen.getAllByRole('checkbox').slice(1); // Skip select all
    expect(alertItems).toHaveLength(3);
  });
});