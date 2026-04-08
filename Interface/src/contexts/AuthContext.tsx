import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { gb } from '../lib/gopherbase';
import type { User } from 'gopherbase';

const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'password';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem('gopherbase_access_token');
      const refreshToken = localStorage.getItem('gopherbase_refresh_token');
      
      if (!accessToken || !refreshToken) {
        setLoading(false);
        return;
      }

      gb.auth.setSession(accessToken, refreshToken);
      const userData = await gb.auth.getUser();
      setUser(userData);
    } catch (err) {
      console.error('Check auth error:', err);
      localStorage.removeItem('gopherbase_access_token');
      localStorage.removeItem('gopherbase_refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    try {
      const token = await gb.auth.signIn(email, password);
      localStorage.setItem('gopherbase_access_token', token.access_token);
      localStorage.setItem('gopherbase_refresh_token', token.refresh_token);
      
      const userData = await gb.auth.getUser();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (_email: string, _password: string) => {
    throw new Error('Sign up is disabled.');
  };

  const signOut = () => {
    gb.auth.signOut().finally(() => {
      localStorage.removeItem('gopherbase_access_token');
      localStorage.removeItem('gopherbase_refresh_token');
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
