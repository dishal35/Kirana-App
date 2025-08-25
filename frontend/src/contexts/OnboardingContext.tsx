import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Shop, Product } from '../types';

interface OnboardingState {
  currentStep: number;
  shopDetails: Partial<Shop>;
  products: Partial<Product>[];
  isComplete: boolean;
}

type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_SHOP_DETAILS'; details: Partial<Shop> }
  | { type: 'ADD_PRODUCT'; product: Partial<Product> }
  | { type: 'UPDATE_PRODUCT'; index: number; product: Partial<Product> }
  | { type: 'REMOVE_PRODUCT'; index: number }
  | { type: 'COMPLETE_ONBOARDING' };

const initialState: OnboardingState = {
  currentStep: 0,
  shopDetails: {},
  products: [],
  isComplete: false,
};

const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_SHOP_DETAILS':
      return { ...state, shopDetails: { ...state.shopDetails, ...action.details } };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p, i) =>
          i === action.index ? { ...p, ...action.product } : p
        ),
      };
    case 'REMOVE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((_, i) => i !== action.index),
      };
    case 'COMPLETE_ONBOARDING':
      return { ...state, isComplete: true };
    default:
      return state;
  }
};

interface OnboardingContextType {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
