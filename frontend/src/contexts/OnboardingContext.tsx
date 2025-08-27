import React, { createContext, useContext, useReducer, type ReactNode, useRef } from 'react';
import type { Shop, Product } from '../types';
//partial types because some of the fields are optional
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
type StepValidationFunction=()=>boolean;
//onReducer is used to update the state based on the action
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
//react.dispatch is used to dispatch the action to the reducer
interface OnboardingContextType {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  registerStepValidation: (validator: StepValidationFunction | null) => void;
  validateStep: (step: number) => boolean;
}
//createContext is used to create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);
//OnboardingProvider is used to provide the context to the children
export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  
  // Store validation function for current step only (not an array)
  const currentStepValidator = useRef<StepValidationFunction | null>(null);
  
  // Register validation function for the current active step
  const registerStepValidation = (validator: StepValidationFunction | null) => {
    currentStepValidator.current = validator;
  };
  
  // Run validation for the current step
  const runStepValidation = (step: number) => {
    // If no validator is registered, assume step is valid
    if (!currentStepValidator.current) return true;
    
    // Run the registered validator
    return currentStepValidator.current();
  };
  
  const contextValue: OnboardingContextType = {
    state,
    dispatch,
    registerStepValidation,
    validateStep: runStepValidation,
  };
  
  return (
    <OnboardingContext.Provider value={contextValue}>
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
