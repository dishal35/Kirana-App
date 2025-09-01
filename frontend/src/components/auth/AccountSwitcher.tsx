import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const AccountSwitcher: React.FC = () => {
  const { user, switchAccount, logout, availableAccounts } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchAccount = async (userId: string) => {
    if (userId === user?.id) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchAccount(userId);
      setIsOpen(false);
      // Reload the page to reset all state
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          user.type === 'demo' 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          {user.name.charAt(0)}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className="text-xs text-white/70">{user.type === 'demo' ? 'Demo Account' : 'New Shop'}</div>
        </div>
        <svg 
          className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-700">Switch Account</div>
              <div className="text-xs text-gray-500">Choose a different account</div>
            </div>
            
            <div className="py-2">
              {availableAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSwitchAccount(account.id)}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                    account.id === user.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      account.type === 'demo' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {account.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{account.name}</div>
                      <div className="text-xs text-gray-500">{account.email}</div>
                    </div>
                    {account.id === user.id && (
                      <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                        Current
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};