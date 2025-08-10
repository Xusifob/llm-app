import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create context with default dummy values. These will be overwritten in the provider.
const AuthContext = createContext<AuthContextValue>({
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

/**
 * Provides authentication state and helpers to log in and sign up.
 * Tokens are persisted to localStorage so that page refreshes keep the session alive.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });

  /**
   * Perform login against the API. Expected response to include a `token` field.
   */
  const login = async (username: string, password: string) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error('Login failed');
    }
    const data = await res.json();
    const receivedToken = data.api_key as string;
    setToken(receivedToken);
    localStorage.setItem('token', receivedToken);
  };

  /**
   * Perform sign‑up. On success, automatically log the user in by saving the returned token.
   */
  const signup = async (username: string, password: string) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error('Signup failed');
    }
    const data = await res.json();
    const receivedToken = data.token as string;
    setToken(receivedToken);
    localStorage.setItem('token', receivedToken);
  };

  /**
   * Clear the session and remove the token from storage.
   */
  const logout = () => {
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access the authentication context.
 */
export const useAuth = () => useContext(AuthContext);