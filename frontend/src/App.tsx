import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DateProvider } from './contexts/DateContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/LoadingSpinner';
import { Navigation, MobileNavigation } from './components/Navigation';
import { LoginPage } from './components/auth/LoginPage';
import { 
  OnboardingWizard,
  BusinessDashboard,
  ChatPage,
  InventoryPage,
  TransactionPage,
  TransactionConfirmationModal,
  DemoPage
} from './components/LazyComponents';
import PerformanceMonitor from './components/PerformanceMonitor';
import DemoModeIndicator from './components/demo/DemoModeIndicator';
import { IntegratedTransactionService } from './services/IntegratedTransactionService';
import type { TransactionResult } from './types';
import './utils/debugAudio'; // Load debug utilities
import './utils/initDemoData'; // Load demo data utility
import './utils/testDatabase'; // Load database test utility
import './utils/demoUtils'; // Load demo utilities
import './utils/testUtils'; // Load testing utilities
import './utils/appVerification'; // Load app verification
import './utils/setupDemo'; // Load demo setup utilities

// Authentication Wrapper Component
const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppContent />;
};

// Main App Content Component
const AppContent: React.FC = () => {
  const { 
    state, 
    processTransaction, 
    confirmTransaction,
    dispatch 
  } = useApp();
  
  const transactionServiceRef = useRef<IntegratedTransactionService | null>(null);

  // Initialize integrated transaction service
  useEffect(() => {
    if (!state.isInitialized || state.isFirstTime) {
      return;
    }

    const service = new IntegratedTransactionService({
      onTransactionDetected: (result: TransactionResult) => {
        console.log('Transaction detected:', result);
        processTransaction(result);
      },
      onError: (error: string) => {
        console.error('Transaction service error:', error);
        dispatch({ type: 'SET_ERROR', error });
      },
      onStatusChange: (status) => {
        dispatch({ type: 'SET_LISTENING', listening: status === 'listening' });
        dispatch({ type: 'SET_PROCESSING_AUDIO', processing: status === 'processing' });
      },
      products: state.products,
      autoSuggestEnabled: state.autoSuggestEnabled,
    });

    transactionServiceRef.current = service;

    // Auto-start listening if not in chat mode
    if (state.currentPage !== 'chat') {
      service.startListening().catch(console.error);
    }

    return () => {
      service.destroy();
      transactionServiceRef.current = null;
    };
  }, [state.isInitialized, state.isFirstTime, state.products, state.autoSuggestEnabled]);

  // Handle page changes for audio service
  useEffect(() => {
    const service = transactionServiceRef.current;
    if (!service) return;

    if (state.currentPage === 'chat') {
      // Stop listening when in chat mode to avoid conflicts
      service.stopListening();
    } else if (!service.isListening()) {
      // Start listening when not in chat mode
      service.startListening().catch(console.error);
    }
  }, [state.currentPage]);

  // Handle transaction confirmation
  const handleConfirmTransaction = async (productSelections: { productId: string; quantity: number }[]) => {
    try {
      await confirmTransaction(productSelections);
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
    }
  };

  const handleCancelTransaction = () => {
    dispatch({ type: 'SET_PENDING_TRANSACTION', transaction: null });
  };

  // Show loading screen while app initializes
  if (!state.isInitialized) {
    return <PageLoader text="Initializing application..." />;
  }

  // Show onboarding for first-time users
  if (state.isFirstTime) {
    return (
      <OnboardingProvider>
        <OnboardingWizard />
      </OnboardingProvider>
    );
  }

  // Render main application content
  const renderPageContent = () => {
    switch (state.currentPage) {
      case 'dashboard':
        return <BusinessDashboard />;
      
      case 'chat':
        return <ChatPage />;
      
      case 'inventory':
        return <InventoryPage />;
      
      case 'transactions':
        return <TransactionPage />;
      
      case 'demo':
        return <DemoPage />;
      
      default:
        return <BusinessDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <Navigation />
      </div>

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        {renderPageContent()}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Transaction Confirmation Modal */}
      {state.pendingTransaction && (
        <TransactionConfirmationModal
          isOpen={true}
          transactionResult={state.pendingTransaction}
          products={state.products}
          onConfirm={handleConfirmTransaction}
          onCancel={handleCancelTransaction}
        />
      )}

      {/* Global Error Display */}
      {state.error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span>{state.error}</span>
            <button
              onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Performance Monitor */}
      <PerformanceMonitor />

      {/* Demo Mode Indicator */}
      <DemoModeIndicator />
    </div>
  );
};

// Root App Component with Providers
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DateProvider>
            <AppProvider>
              <AuthenticatedApp />
            </AppProvider>
          </DateProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App
