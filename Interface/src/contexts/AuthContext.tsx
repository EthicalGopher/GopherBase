import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const API_BASE = 'http://localhost:8080/rest/v1';

const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = (import.meta as any).env.VITE_ADMIN_PASSWORD || 'password';

export interface User {
  id: string;
  email: string;
  [key: string]: unknown;
}

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
    const isAdmin = localStorage.getItem('gopherbase_is_admin');
    if (isAdmin === 'true') {
      setUser({ id: 'admin', email: ADMIN_EMAIL });
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('gopherbase_is_admin', 'true');
      setUser({ id: 'admin', email: ADMIN_EMAIL });
    } else {
      setError('Invalid email or password');
      throw new Error('Invalid email or password');
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      await signIn(email, password);
    } else {
      setError('Registration is disabled. Please use admin credentials.');
      throw new Error('Registration is disabled');
    }
  };

  const signOut = () => {
    localStorage.removeItem('gopherbase_is_admin');
    setUser(null);
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
