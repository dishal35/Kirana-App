import { useEffect, useState } from 'react';
import './App.css';
import { OnboardingProvider } from './contexts/OnboardingContext';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import { shopRepository } from './dbs/repo';

function App() {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      const shops = await shopRepository.getAll();
      setIsFirstTime(shops.length === 0);
    };

    checkFirstTimeUser();
  }, []);

  if (isFirstTime === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isFirstTime ? (
        <OnboardingProvider>
          <OnboardingWizard />
        </OnboardingProvider>
      ) : (
        <div className="p-4">
          {/* Main app content will go here */}
          <h1>Welcome back to your shop!</h1>
        </div>
      )}
    </div>
  )
}

export default App
