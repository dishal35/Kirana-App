import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, availableAccounts } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid credentials. Use demo123 or admin as password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (accountEmail: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await login(accountEmail, 'demo123');
      if (!success) {
        setError('Quick login failed.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-3xl text-white">🏪</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to Kirana
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Smart UPI Transaction Tracker for Your Shop
          </p>
        </div>

        {/* Quick Login Options */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-indigo-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Quick Login</h3>
          <div className="space-y-3">
            {availableAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => quickLogin(account.email)}
                disabled={isLoading}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  account.type === 'demo'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300 text-green-800'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 text-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold">{account.name}</div>
                    <div className="text-sm opacity-75">{account.email}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    account.type === 'demo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {account.type === 'demo' ? '🚀 Demo Shop' : '✨ New Shop'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Login Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-indigo-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Manual Login</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="bg-gray-50/80 backdrop-blur-lg rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>📧 <strong>Email:</strong> demo@kirana.app or newshop@kirana.app</div>
            <div>🔑 <strong>Password:</strong> demo123 or admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};