import { useEffect, useState } from 'react';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { shopRepository } from './dbs/repo';
import AudioRecorderComponent from './components/AudioRecorderComponent';
import SimpleAmountTest from './examples/SimpleAmountTest';
import SimpleVoiceDemo from './examples/SimpleVoiceDemo';
import RealTimeVoiceDemo from './examples/RealTimeVoiceDemo';
import ProductSuggestionExample from './examples/ProductSuggestionExample';
import './utils/debugAudio'; // Load debug utilities

function App() {
  //sets the state for first time users by checking if the shop repository is empty
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'amount-extraction' | 'voice-demo' | 'real-voice' | 'product-suggestions'>('main');

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        console.log('Checking first time user...');
        const shops = await shopRepository.getAll();
        console.log('Shops found:', shops.length);
        setIsFirstTime(shops.length === 0);
      } catch (error) {
        console.error('Error checking first time user:', error);
        setIsFirstTime(false); // Default to not first time on error
      }
    };

    checkFirstTimeUser();
  }, []);

  if (isFirstTime === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Checking shop setup</div>
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
      case 'main':
      default:
        return (
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome back to your shop!</h1>
            <AudioRecorderComponent />
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
