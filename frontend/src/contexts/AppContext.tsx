import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Shop, Product, Transaction, TransactionResult } from '../types';
import { shopRepository, productRepository, transactionRepository } from '../dbs/repo';

// Application State Interface
interface AppState {
  // Authentication & Setup
  isInitialized: boolean;
  isFirstTime: boolean | null;
  currentShop: Shop | null;
  
  // Navigation
  currentPage: 'onboarding' | 'dashboard' | 'chat' | 'inventory' | 'transactions' | 'demo';
  
  // Data
  products: Product[];
  todaysTransactions: Transaction[];
  
  // Audio Processing
  isListening: boolean;
  isProcessingAudio: boolean;
  pendingTransaction: TransactionResult | null;
  
  // UI State
  loading: {
    app: boolean;
    data: boolean;
    audio: boolean;
  };
  error: string | null;
  
  // Settings
  language: 'en' | 'hi' | 'kn';
  autoSuggestEnabled: boolean;
}

// Action Types
type AppAction =
  | { type: 'SET_INITIALIZED'; initialized: boolean }
  | { type: 'SET_FIRST_TIME'; isFirstTime: boolean }
  | { type: 'SET_CURRENT_SHOP'; shop: Shop }
  | { type: 'SET_CURRENT_PAGE'; page: AppState['currentPage'] }
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'SET_TODAYS_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'SET_LISTENING'; listening: boolean }
  | { type: 'SET_PROCESSING_AUDIO'; processing: boolean }
  | { type: 'SET_PENDING_TRANSACTION'; transaction: TransactionResult | null }
  | { type: 'SET_LOADING'; loadingType: keyof AppState['loading']; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LANGUAGE'; language: AppState['language'] }
  | { type: 'SET_AUTO_SUGGEST'; enabled: boolean }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: AppState = {
  isInitialized: false,
  isFirstTime: null,
  currentShop: null,
  currentPage: 'dashboard',
  products: [],
  todaysTransactions: [],
  isListening: false,
  isProcessingAudio: false,
  pendingTransaction: null,
  loading: {
    app: true,
    data: false,
    audio: false,
  },
  error: null,
  language: 'en',
  autoSuggestEnabled: true,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.initialized };
    
    case 'SET_FIRST_TIME':
      return { ...state, isFirstTime: action.isFirstTime };
    
    case 'SET_CURRENT_SHOP':
      return { ...state, currentShop: action.shop };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.page };
    
    case 'SET_PRODUCTS':
      return { ...state, products: action.products };
    
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] };
    
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => 
          p.id === action.product.id ? action.product : p
        ),
      };
    
    case 'SET_TODAYS_TRANSACTIONS':
      return { ...state, todaysTransactions: action.transactions };
    
    case 'ADD_TRANSACTION':
      return { 
        ...state, 
        todaysTransactions: [...state.todaysTransactions, action.transaction] 
      };
    
    case 'SET_LISTENING':
      return { ...state, isListening: action.listening };
    
    case 'SET_PROCESSING_AUDIO':
      return { ...state, isProcessingAudio: action.processing };
    
    case 'SET_PENDING_TRANSACTION':
      return { ...state, pendingTransaction: action.transaction };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.loadingType]: action.loading },
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.error };
    
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };
    
    case 'SET_AUTO_SUGGEST':
      return { ...state, autoSuggestEnabled: action.enabled };
    
    case 'RESET_STATE':
      return { ...initialState, isInitialized: true };
    
    default:
      return state;
  }
};

// Context Interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Actions
  initializeApp: () => Promise<void>;
  navigateTo: (page: AppState['currentPage']) => void;
  refreshData: () => Promise<void>;
  completeOnboarding: (shop: Shop, products: Product[]) => Promise<void>;
  processTransaction: (transactionResult: TransactionResult) => Promise<void>;
  confirmTransaction: (productSelections: { productId: string; quantity: number }[]) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
}

// Create Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Initialize application
  const initializeApp = async () => {
    try {
      dispatch({ type: 'SET_LOADING', loadingType: 'app', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      // Check if this is a first-time user
      const shops = await shopRepository.getAll();
      const isFirstTime = shops.length === 0;
      
      dispatch({ type: 'SET_FIRST_TIME', isFirstTime });

      if (!isFirstTime) {
        // Load existing shop and data
        const currentShop = shops[0]; // Assuming single shop for MVP
        dispatch({ type: 'SET_CURRENT_SHOP', shop: currentShop });
        
        // Load initial data
        await refreshData();
        
        // Set language from shop settings
        dispatch({ type: 'SET_LANGUAGE', language: currentShop.settings.language });
        dispatch({ type: 'SET_AUTO_SUGGEST', enabled: currentShop.settings.autoSuggestEnabled });
      }

      dispatch({ type: 'SET_INITIALIZED', initialized: true });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to initialize application' });
    } finally {
      dispatch({ type: 'SET_LOADING', loadingType: 'app', loading: false });
    }
  };

  // Navigate to different pages
  const navigateTo = (page: AppState['currentPage']) => {
    dispatch({ type: 'SET_CURRENT_PAGE', page });
  };

  // Refresh data from database
  const refreshData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: true });
      
      // Load products
      const products = await productRepository.getAll();
      dispatch({ type: 'SET_PRODUCTS', products });
      
      // Load today's transactions
      const todaysTransactions = await transactionRepository.getTodaysTransactions();
      dispatch({ type: 'SET_TODAYS_TRANSACTIONS', transactions: todaysTransactions });
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load data' });
    } finally {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: false });
    }
  };

  // Complete onboarding process
  const completeOnboarding = async (shop: Shop, products: Product[]) => {
    try {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: true });
      
      // Save shop
      const savedShop = await shopRepository.create(shop);
      dispatch({ type: 'SET_CURRENT_SHOP', shop: savedShop });
      
      // Save products
      const savedProducts: Product[] = [];
      for (const product of products) {
        const savedProduct = await productRepository.create(product);
        savedProducts.push(savedProduct);
      }
      dispatch({ type: 'SET_PRODUCTS', products: savedProducts });
      
      // Update first-time status
      dispatch({ type: 'SET_FIRST_TIME', isFirstTime: false });
      
      // Navigate to dashboard
      dispatch({ type: 'SET_CURRENT_PAGE', page: 'dashboard' });
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to save shop data' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: false });
    }
  };

  // Process audio transaction result
  const processTransaction = async (transactionResult: TransactionResult) => {
    dispatch({ type: 'SET_PENDING_TRANSACTION', transaction: transactionResult });
    // This will trigger the transaction confirmation modal
  };

  // Confirm and save transaction
  const confirmTransaction = async (productSelections: { productId: string; quantity: number }[]) => {
    if (!state.pendingTransaction) return;

    try {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: true });
      
      // Create transaction
      const transaction: Omit<Transaction, 'id'> = {
        amount: state.pendingTransaction.amount,
        products: productSelections.map(selection => {
          const product = state.products.find(p => p.id === selection.productId);
          return {
            productId: selection.productId,
            quantity: selection.quantity,
            unitPrice: product?.price || 0,
          };
        }),
        type: 'upi',
        timestamp: new Date(),
        transcription: state.pendingTransaction.transcription,
        confidence: state.pendingTransaction.confidence,
      };
      
      // Save transaction
      const savedTransaction = await transactionRepository.create(transaction);
      dispatch({ type: 'ADD_TRANSACTION', transaction: savedTransaction });
      
      // Update product stock
      for (const selection of productSelections) {
        const product = state.products.find(p => p.id === selection.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            stock: product.stock - selection.quantity,
            updatedAt: new Date(),
          };
          await productRepository.update(updatedProduct);
          dispatch({ type: 'UPDATE_PRODUCT', product: updatedProduct });
        }
      }
      
      // Clear pending transaction
      dispatch({ type: 'SET_PENDING_TRANSACTION', transaction: null });
      
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to save transaction' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', loadingType: 'data', loading: false });
    }
  };

  // Audio capture controls
  const startListening = () => {
    dispatch({ type: 'SET_LISTENING', listening: true });
  };

  const stopListening = () => {
    dispatch({ type: 'SET_LISTENING', listening: false });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    initializeApp,
    navigateTo,
    refreshData,
    completeOnboarding,
    processTransaction,
    confirmTransaction,
    startListening,
    stopListening,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};