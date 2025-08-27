import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '../../components/onboarding/OnboardingWizard';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { mockShops, mockProducts } from '../../test/mocks';
import { shopRepository, productRepository } from '../../dbs/repo';

vi.mock('../../dbs/repo', () => ({
  shopRepository: {
    create: vi.fn().mockResolvedValue('test-shop-id')
  },
  productRepository: {
    create: vi.fn().mockResolvedValue('test-product-id')
  }
}));

describe('OnboardingWizard', () => {
  const renderWizard = () => {
    return render(
      <OnboardingProvider>
        <OnboardingWizard />
      </OnboardingProvider>
    );
  };

  describe('Shop Details Form', () => {
    it('should render the shop details form first', () => {
      renderWizard();
      expect(screen.getByRole('heading', { name: /shop details/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      renderWizard();
      
      // Try to submit without filling required fields
      const nameInput = screen.getByLabelText(/shop name/i);
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText(/shop name is required/i)).toBeInTheDocument();
      });
    });

    it('should proceed to next step with valid data', async () => {
      renderWizard();
      
      // Fill in valid shop details
      fireEvent.change(screen.getByLabelText(/shop name/i), {
        target: { value: mockShops.valid.name }
      });
      fireEvent.change(screen.getByLabelText(/shop type/i), {
        target: { value: mockShops.valid.type }
      });
      
      // Submit form
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      // Should show product catalog form
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /product catalog/i })).toBeInTheDocument();
      });
    });
  });

  describe('Product Catalog Form', () => {
    it('should allow adding products', async () => {
      renderWizard();
      
      // Navigate to product catalog form
      await fillAndSubmitShopDetails();
      
      // Add a product
      const addButton = screen.getByRole('button', { name: /add product/i });
      fireEvent.click(addButton);
      
      fireEvent.change(screen.getByLabelText(/product name/i), {
        target: { value: mockProducts.valid.name }
      });
      fireEvent.change(screen.getByLabelText(/price/i), {
        target: { value: mockProducts.valid.price }
      });
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: mockProducts.valid.category }
      });
      fireEvent.change(screen.getByLabelText(/stock/i), {
        target: { value: mockProducts.valid.stock }
      });
      
      const addProductButton = screen.getByRole('button', { name: /add product/i });
      fireEvent.click(addProductButton);
      
      await waitFor(() => {
        expect(screen.getByText(mockProducts.valid.name)).toBeInTheDocument();
      });
    });
  });

  describe('Completion', () => {
    it('should show success message on completion', async () => {
      renderWizard();
      
      // Complete all steps
      await fillAndSubmitShopDetails();
      await fillAndSubmitProductCatalog();
      
      const completeButton = screen.getByRole('button', { name: /complete setup/i });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /setup complete/i })).toBeInTheDocument();
      });
    });
  });
});

// Helper function to fill and submit shop details
async function fillAndSubmitShopDetails() {
  fireEvent.change(screen.getByLabelText(/shop name/i), {
    target: { value: mockShops.valid.name }
  });
  fireEvent.change(screen.getByLabelText(/shop type/i), {
    target: { value: mockShops.valid.type }
  });
  
  const nextButton = screen.getByRole('button', { name: /next/i });
  fireEvent.click(nextButton);
  
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /product catalog/i })).toBeInTheDocument();
  });
}

// Helper function to fill and submit product catalog
async function fillAndSubmitProductCatalog() {
  fireEvent.change(screen.getByLabelText(/product name/i), {
    target: { value: mockProducts.valid.name }
  });
  fireEvent.change(screen.getByLabelText(/category/i), {
    target: { value: mockProducts.valid.category }
  });
  fireEvent.change(screen.getByLabelText(/price/i), {
    target: { value: mockProducts.valid.price }
  });
  fireEvent.change(screen.getByLabelText(/initial stock/i), {
    target: { value: mockProducts.valid.stock }
  });
  
  const addButton = screen.getByRole('button', { name: /add product/i });
  fireEvent.click(addButton);
  
  const completeButton = screen.getByRole('button', { name: /complete setup/i });
  fireEvent.click(completeButton);
}
