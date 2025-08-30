import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { ShopDetailsForm } from './ShopDetailsForm';
import { ProductCatalogForm } from './ProductCatalogForm';
import { shopRepository, productRepository } from '../../dbs/repo';
import { DemoDataService } from '../../services/DemoDataService';


export const OnboardingWizard: React.FC = () => {
  const { state, dispatch, validateStep } = useOnboarding();
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState('');
  const [showDemoOption, setShowDemoOption] = React.useState(true);

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
    const isStepValid = validateStep(state.currentStep);
    if (!isStepValid) {
      alert('Please fix the errors in the current step');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Creating your shop...');

      // Create shop
      await shopRepository.create({
        ...state.shopDetails as any,
        ownerId: 'default', // In a real app, this would come from auth
        settings: {
          currency: 'INR',
          language: 'en',
          lowStockThreshold: 5,
          autoSuggestEnabled: true
        }
      });

      setLoadingMessage('Setting up your product catalog...');

      // Create products
      await Promise.all(
        state.products.map(product =>
          productRepository.create({
            ...product as any,
            reorderThreshold: 5 // Default value
          })
        )
      );

      setLoadingMessage('Finalizing setup...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Add a small delay for better UX

      dispatch({ type: 'COMPLETE_ONBOARDING' });
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // In a real app, show error message to user
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDemoSetup = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Setting up demo shop...');
      
      await DemoDataService.initializeDemoShop();
      
      setLoadingMessage('Demo setup complete!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    } catch (error) {
      console.error('Failed to setup demo shop:', error);
      alert('Failed to setup demo shop. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8 transition-all duration-500">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 transform hover:scale-[1.01] transition-transform">
          <div className="rounded-2xl p-8 bg-white/80 backdrop-blur-lg shadow-xl border border-indigo-50 hover:border-indigo-100 transition-all">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Welcome to Kirana — Setup Wizard</h1>
            <p className="mt-2 text-base text-gray-600">A few quick steps to get your shop ready.</p>
          </div>
        </header>

        {/* Demo Option */}
        {showDemoOption && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100 hover:border-green-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🚀</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-800">Try Demo Shop</h3>
                </div>
                <p className="text-green-700 mb-4">
                  Want to explore the app first? Set up a demo shop with 30+ products and sample transactions to see how everything works.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-green-600 mb-4">
                  <span className="px-3 py-1 bg-green-100 rounded-full">✓ 30+ Products</span>
                  <span className="px-3 py-1 bg-green-100 rounded-full">✓ Sample Transactions</span>
                  <span className="px-3 py-1 bg-green-100 rounded-full">✓ AI Suggestions</span>
                  <span className="px-3 py-1 bg-green-100 rounded-full">✓ Ready to Use</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDemoSetup}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Setting up...' : 'Setup Demo Shop'}
                  </button>
                  <button
                    onClick={() => setShowDemoOption(false)}
                    className="px-6 py-3 bg-white text-green-700 font-medium rounded-xl hover:bg-green-50 border-2 border-green-200 hover:border-green-300 transition-all"
                  >
                    Setup My Own Shop
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowDemoOption(false)}
                className="ml-4 p-2 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-indigo-50 hover:border-indigo-100 transition-all">
          <div className="flex items-center gap-6">
            {steps.map((step, index) => {
              const active = index <= state.currentStep;
              return (
                <React.Fragment key={step.title}>
                  <div className="flex items-center gap-4 group">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 transform ${
                        active 
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-110' 
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                      }`}
                    >
                      <span className="font-semibold text-lg">{index + 1}</span>
                    </div>
                    <div className="hidden sm:block">
                      <div className={`text-sm font-medium transition-colors duration-300 ${
                        active ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'
                      }`}>{step.title}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                      active ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <main className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 mb-8 border border-indigo-50 hover:border-indigo-100 transition-all transform hover:scale-[1.01] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
              <div className="w-16 h-16 mb-4">
                <div className="w-full h-full border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-lg font-medium text-indigo-600">{loadingMessage}</p>
            </div>
          )}
          {state.isComplete ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mx-auto flex items-center justify-center mb-6 animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">Setup Complete!</h2>
              <p className="text-lg text-gray-600 mb-8">Your shop is ready to go. You can now start managing your inventory and tracking sales.</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200 transform hover:scale-105 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            steps[state.currentStep].component
          )}
        </main>

        {!state.isComplete && (
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={state.currentStep === 0}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                state.currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                  : 'bg-white text-gray-700 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-100 border-2 border-gray-200 hover:border-indigo-200'
              }`}
            >
              Back
            </button>

            <div className="flex items-center gap-4">
              {state.currentStep < steps.length - 1 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all"
                >
                  Next
                </button>
              )}

              {state.currentStep === steps.length - 1 && (
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200 transform hover:scale-105 transition-all"
                >
                  Complete Setup
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


