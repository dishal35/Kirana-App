import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AccountSwitcher } from './auth/AccountSwitcher';
import { DateNavigator } from './common/DateNavigator';

interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const { state, navigateTo } = useApp();

  const navigationItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: '📊',
      description: 'Business overview and metrics',
    },
    {
      id: 'transactions' as const,
      label: 'Transactions',
      icon: '💳',
      description: 'View and manage transactions',
    },
    {
      id: 'inventory' as const,
      label: 'Inventory',
      icon: '📦',
      description: 'Manage products and stock',
    },
    {
      id: 'chat' as const,
      label: 'Assistant',
      icon: '🤖',
      description: 'AI business assistant',
    },
    {
      id: 'demo' as const,
      label: 'Demo',
      icon: '🎯',
      description: 'Hackathon demo environment',
    },
  ];

  const getLanguageText = (key: string) => {
    const translations = {
      dashboard: {
        en: 'Dashboard',
        hi: 'डैशबोर्ड',
        kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      },
      transactions: {
        en: 'Transactions',
        hi: 'लेन-देन',
        kn: 'ವ್ಯವಹಾರಗಳು',
      },
      inventory: {
        en: 'Inventory',
        hi: 'स्टॉक',
        kn: 'ಸ್ಟಾಕ್',
      },
      chat: {
        en: 'Assistant',
        hi: 'सहायक',
        kn: 'ಸಹಾಯಕ',
      },
      demo: {
        en: 'Demo',
        hi: 'डेमो',
        kn: 'ಡೆಮೊ',
      },
    };

    return translations[key as keyof typeof translations]?.[state.language] || key;
  };

  return (
    <nav className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl">🏪</span>
              <span className="ml-2 text-xl font-bold text-gray-900">
                {state.currentShop?.name || 'Kirana Shop'}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  state.currentPage === item.id
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={item.description}
              >
                <span className="mr-2">{item.icon}</span>
                {getLanguageText(item.id)}
              </button>
            ))}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            {/* Audio Status */}
            {state.isListening && (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                <span className="text-sm font-medium">Listening</span>
              </div>
            )}

            {state.isProcessingAudio && (
              <div className="flex items-center text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
                <span className="text-sm font-medium">Processing</span>
              </div>
            )}

            {/* Language Selector */}
            <select
              value={state.language}
              onChange={(e) => {
                // This would be handled by the app context
                console.log('Language change:', e.target.value);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>

            {/* Account Switcher */}
            <AccountSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
};

// Mobile Navigation Component
export const MobileNavigation: React.FC = () => {
  const { state, navigateTo } = useApp();

  const navigationItems = [
    { id: 'dashboard' as const, icon: '📊', label: 'Home' },
    { id: 'transactions' as const, icon: '💳', label: 'Sales' },
    { id: 'inventory' as const, icon: '📦', label: 'Stock' },
    { id: 'chat' as const, icon: '🤖', label: 'Chat' },
    { id: 'demo' as const, icon: '🎯', label: 'Demo' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 md:hidden">
      <div className="flex justify-around">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              state.currentPage === item.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};