import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  shopId?: string;
  type: 'demo' | 'new';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchAccount: (userId: string) => Promise<boolean>;
  isAuthenticated: boolean;
  availableAccounts: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preloaded accounts
const DEMO_ACCOUNTS: User[] = [
  {
    id: 'demo-user',
    name: 'Sharma General Store',
    email: 'demo@kirana.app',
    shopId: 'demo-shop',
    type: 'demo'
  },
  {
    id: 'new-user',
    name: 'New Shop Owner',
    email: 'newshop@kirana.app',
    type: 'new'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('kirana-user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('kirana-user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simple authentication - in real app, this would be API call
    const account = DEMO_ACCOUNTS.find(acc => acc.email === email);
    
    if (account && (password === 'demo123' || password === 'admin')) {
      setUser(account);
      setIsAuthenticated(true);
      localStorage.setItem('kirana-user', JSON.stringify(account));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('kirana-user');
    localStorage.removeItem('kirana-onboarding-complete');
  };

  const switchAccount = async (userId: string): Promise<boolean> => {
    const account = DEMO_ACCOUNTS.find(acc => acc.id === userId);
    
    if (account) {
      setUser(account);
      localStorage.setItem('kirana-user', JSON.stringify(account));
      
      // Clear onboarding state when switching accounts
      localStorage.removeItem('kirana-onboarding-complete');
      
      return true;
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      switchAccount,
      isAuthenticated,
      availableAccounts: DEMO_ACCOUNTS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};