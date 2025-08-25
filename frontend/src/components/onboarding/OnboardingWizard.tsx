import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { ShopDetailsForm } from './ShopDetailsForm';
import { ProductCatalogForm } from './ProductCatalogForm';
import { shopRepository, productRepository } from '../../dbs/repo';

const OnboardingWizard: React.FC = () => {
  const { state, dispatch } = useOnboarding();

  const steps = [
    { title: 'Shop Details', component: <ShopDetailsForm /> },
    { title: 'Product Catalog', component: <ProductCatalogForm /> },
  ];

  const handleNext = () => {
    if (state.currentStep < steps.length - 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    }
  };

  const handleBack = () => {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  };

  const handleComplete = async () => {
    try {
      // Create shop
      const shopId = await shopRepository.create({
        ...state.shopDetails as any,
        ownerId: 'default', // In a real app, this would come from auth
        settings: {
          currency: 'INR',
          language: 'en',
          lowStockThreshold: 5,
          autoSuggestEnabled: true
        }
      });

      // Create products
      await Promise.all(
        state.products.map(product =>
          productRepository.create({
            ...product as any,
            reorderThreshold: 5 // Default value
          })
        )
      );

      dispatch({ type: 'COMPLETE_ONBOARDING' });
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // In a real app, show error message to user
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= state.currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="ml-2">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-200" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Current step */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          {steps[state.currentStep].component}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={state.currentStep === 0}
            className={`px-4 py-2 rounded ${
              state.currentStep === 0
                ? 'bg-gray-200 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Back
          </button>
          {state.currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Complete Setup
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
