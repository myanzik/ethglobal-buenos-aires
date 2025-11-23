'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, GitHubUser, getGitHubUser } from './github-auth';

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
};

// Create context
const AuthContext = createContext<{
  authState: AuthState;
  login: (accessToken: string) => Promise<void>;
  logout: () => void;
}>({
  authState: defaultAuthState,
  login: async () => {},
  logout: () => {},
});

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Check for existing token on mount
  useEffect(() => {
    const loadAuthState = () => {
      const token = localStorage.getItem('githunder_access_token');
      
      if (token) {
        // Validate token and load user data
        getGitHubUser(token)
          .then((user) => {
            setAuthState({
              isAuthenticated: true,
              user,
              accessToken: token,
            });
          })
          .catch(() => {
            // Token might be invalid, clear it
            localStorage.removeItem('githunder_access_token');
            setAuthState(defaultAuthState);
          });
      }
    };

    loadAuthState();
  }, []);

  // Login function
  const login = async (accessToken: string) => {
    try {
      // Get user data with the token
      const user = await getGitHubUser(accessToken);
      
      // Save token
      localStorage.setItem('githunder_access_token', accessToken);
      
      // Update state
      setAuthState({
        isAuthenticated: true,
        user,
        accessToken,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    // Clear stored token
    localStorage.removeItem('githunder_access_token');
    
    // Reset state
    setAuthState(defaultAuthState);
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
