import { useEffect, useState } from 'react';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { shopRepository } from './dbs/repo';
import AudioRecorderComponent from './components/AudioRecorderComponent';
import SimpleAmountTest from './examples/SimpleAmountTest';
import SimpleVoiceDemo from './examples/SimpleVoiceDemo';
import RealTimeVoiceDemo from './examples/RealTimeVoiceDemo';
import ProductSuggestionExample from './examples/ProductSuggestionExample';
import { TransactionConfirmationExample } from './examples/TransactionConfirmationExample';
import { BusinessDashboardExample } from './examples/BusinessDashboardExample';
import { DebugInfo } from './components/DebugInfo';
import './utils/debugAudio'; // Load debug utilities
import './utils/initDemoData'; // Load demo data utility
import './utils/testDatabase'; // Load database test utility

function App() {
  //sets the state for first time users by checking if the shop repository is empty
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'amount-extraction' | 'voice-demo' | 'real-voice' | 'product-suggestions' | 'transaction-confirmation' | 'dashboard'>('main');

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        console.log('App: Starting first time user check...');
        const shops = await shopRepository.getAll();
        console.log('App: Shops found:', shops.length);
        console.log('App: Setting isFirstTime to:', shops.length === 0);
        setIsFirstTime(shops.length === 0);
      } catch (error) {
        console.error('App: Error checking first time user:', error);
        console.log('App: Setting isFirstTime to false due to error');
        setIsFirstTime(false); // Default to not first time on error
      }
    };

    console.log('App: Component mounted, checking first time user...');
    checkFirstTimeUser();
  }, []);

  if (isFirstTime === null) {
    console.log('App: Rendering loading state (isFirstTime is null)');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Checking shop setup</div>
          <div className="text-xs text-gray-400 mt-4">
            Check browser console for debug information
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering app, isFirstTime:', isFirstTime, 'currentView:', currentView);

  const renderMainContent = () => {
    switch (currentView) {
      case 'amount-extraction':
        return <SimpleAmountTest />;
      case 'voice-demo':
        return <SimpleVoiceDemo />;
      case 'real-voice':
        return <RealTimeVoiceDemo />;
      case 'product-suggestions':
        return <ProductSuggestionExample />;
      case 'transaction-confirmation':
        return <TransactionConfirmationExample />;
      case 'dashboard':
        return <BusinessDashboardExample />;
      case 'main':
      default:
        return (
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome back to your shop!</h1>
            <DebugInfo />
            <div className="mt-4">
              <AudioRecorderComponent />
            </div>
          </div>
        );
    }
  };

  return (
    //if the user is a first time user, the onboarding wizard is displayed, otherwise the main app content is displayed
    <div className="min-h-screen bg-gray-50">
      {isFirstTime ? (
        <OnboardingProvider>
          <OnboardingWizard />
        </OnboardingProvider>
      ) : (
        <div>
          {/* Navigation */}
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setCurrentView('main')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'main'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🏪 Main App
                  </button>
                  <button
                    onClick={() => setCurrentView('amount-extraction')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'amount-extraction'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🔍 Text Demo
                  </button>
                  <button
                    onClick={() => setCurrentView('voice-demo')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'voice-demo'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🎤 Voice Demo
                  </button>
                  <button
                    onClick={() => setCurrentView('real-voice')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'real-voice'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🎙️ Real Voice
                  </button>
                  <button
                    onClick={() => setCurrentView('product-suggestions')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'product-suggestions'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🛍️ Product Suggestions
                  </button>
                  <button
                    onClick={() => setCurrentView('transaction-confirmation')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'transaction-confirmation'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    💳 Transaction Confirmation
                  </button>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentView === 'dashboard'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Dashboard
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          {renderMainContent()}
        </div>
      )}
    </div>
  )
}

export default App
