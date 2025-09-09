/**
 * Lazy-loaded components for better performance and reduced bundle size
 */

import React, { Suspense, lazy } from 'react';
import { PageLoader } from './LoadingSpinner';

// Lazy load heavy components
export const LazyBusinessDashboard = lazy(() => 
  import('./dashboard/BusinessDashboard').then(module => ({ default: module.BusinessDashboard }))
);

export const LazyChatPage = lazy(() => 
  import('./chat/ChatPage').then(module => ({ default: module.ChatPage }))
);

export const LazyInventoryPage = lazy(() => 
  import('./inventory/InventoryPage').then(module => ({ default: module.InventoryPage }))
);

export const LazyTransactionPage = lazy(() => 
  import('./transactions/TransactionPage').then(module => ({ default: module.TransactionPage }))
);

export const LazyOnboardingWizard = lazy(() => 
  import('./onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard }))
);

// Temporary direct import to fix loading issue
import { TransactionConfirmationModal as DirectTransactionConfirmationModal } from './transaction/TransactionConfirmationModal';

export const LazyTransactionConfirmationModal = DirectTransactionConfirmationModal;

export const LazyDemoPage = lazy(() => 
  import('./demo/DemoPage').then(module => ({ default: module.default }))
);

// Wrapper components with suspense
export const BusinessDashboard: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading dashboard..." />}>
    <LazyBusinessDashboard />
  </Suspense>
);

export const ChatPage: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading chat..." />}>
    <LazyChatPage />
  </Suspense>
);

export const InventoryPage: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading inventory..." />}>
    <LazyInventoryPage />
  </Suspense>
);

export const TransactionPage: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading transactions..." />}>
    <LazyTransactionPage />
  </Suspense>
);

export const OnboardingWizard: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading onboarding..." />}>
    <LazyOnboardingWizard />
  </Suspense>
);

interface TransactionConfirmationModalProps {
  isOpen: boolean;
  transactionResult: any;
  products: any[];
  onConfirm: (selections: { productId: string; quantity: number }[]) => void;
  onCancel: () => void;
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({ 
  isOpen, 
  transactionResult, 
  products, 
  onConfirm, 
  onCancel 
}) => {
  const handleTransactionConfirmed = async (transaction: { products: { productId: string; quantity: number }[] }) => {
    // Convert transaction to the expected format for onConfirm
    const selections = transaction.products.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity
    }));
    onConfirm(selections);
  };

  // Debug logging
  console.log('🎨 LazyComponents rendering modal with props:');
  console.log('   - isOpen:', isOpen);
  console.log('   - amount:', transactionResult?.amount || 0);
  console.log('   - suggestedProducts:', (transactionResult?.suggestedProducts || []).length);
  console.log('   - suggestedProductsWithQuantities:', (transactionResult?.suggestedProductsWithQuantities || []).length);
  if (transactionResult?.suggestedProductsWithQuantities?.length > 0) {
    console.log('   - Exact match data:', transactionResult.suggestedProductsWithQuantities);
  }
  
  return (
    <LazyTransactionConfirmationModal 
      isOpen={isOpen}
      onClose={onCancel}
      amount={transactionResult?.amount || 0}
      suggestedProducts={transactionResult?.suggestedProducts || []}
      suggestedProductsWithQuantities={transactionResult?.suggestedProductsWithQuantities || []}
      transcription={transactionResult?.transcription}
      confidence={transactionResult?.confidence}
      onTransactionConfirmed={handleTransactionConfirmed}
    />
  );
};

export const DemoPage: React.FC = () => (
  <Suspense fallback={<PageLoader text="Loading demo environment..." />}>
    <LazyDemoPage />
  </Suspense>
);