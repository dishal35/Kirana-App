import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '../../components/onboarding/OnboardingWizard';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { mockShops } from '../../test/mocks';

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
      expect(screen.getByText(/shop details/i)).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      renderWizard();
      
      // Try to submit without filling required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
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
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: mockShops.valid.phone }
      });
      
      // Submit form
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      // Should show product catalog form
      await waitFor(() => {
        expect(screen.getByText(/product catalog/i)).toBeInTheDocument();
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
      fireEvent.change(screen.getByLabelText(/stock/i), {
        target: { value: mockProducts.valid.stock }
      });
      
      const saveButton = screen.getByRole('button', { name: /save product/i });
      fireEvent.click(saveButton);
      
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
      
      await waitFor(() => {
        expect(screen.getByText(/setup complete/i)).toBeInTheDocument();
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
  fireEvent.change(screen.getByLabelText(/phone/i), {
    target: { value: mockShops.valid.phone }
  });
  
  const nextButton = screen.getByRole('button', { name: /next/i });
  fireEvent.click(nextButton);
  
  await waitFor(() => {
    expect(screen.getByText(/product catalog/i)).toBeInTheDocument();
  });
}

// Helper function to fill and submit product catalog
async function fillAndSubmitProductCatalog() {
  const addButton = screen.getByRole('button', { name: /add product/i });
  fireEvent.click(addButton);
  
  fireEvent.change(screen.getByLabelText(/product name/i), {
    target: { value: mockProducts.valid.name }
  });
  fireEvent.change(screen.getByLabelText(/price/i), {
    target: { value: mockProducts.valid.price }
  });
  fireEvent.change(screen.getByLabelText(/stock/i), {
    target: { value: mockProducts.valid.stock }
  });
  
  const saveButton = screen.getByRole('button', { name: /save product/i });
  fireEvent.click(saveButton);
  
  const finishButton = screen.getByRole('button', { name: /finish/i });
  fireEvent.click(finishButton);
}
