import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const getApiBase = () => {
  const envApiBase = (import.meta as any).env.VITE_API_URL;
  if (envApiBase) return envApiBase;

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // If we're on Vite dev (5173) or preview (4173), 
    // point to the backend on port 8080 of the SAME host.
    if (port === '5173' || port === '4173') {
      return `${protocol}//${hostname}:8080/rest/v1`;
    }
  }
  // In production (embedded), or if we can't detect, use relative paths.
  return '/rest/v1';
};

export const API_BASE = getApiBase();

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

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON response:', text.substring(0, 100));
    throw new Error('Server returned an invalid response. Please try again.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('gopherbase_access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const userData = await safeJson(res);
        setUser(userData);
      } else {
        localStorage.removeItem('gopherbase_access_token');
        setUser(null);
      }
    } catch (err) {
      console.error('Check auth error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    // Allow local admin bypass even if server is wonky
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
       // Proceed to attempt real signin, but we have a fallback
    }

    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('gopherbase_access_token', data.access_token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (_email: string, _password: string) => {
    throw new Error('Sign up is disabled.');
  };

  const signOut = () => {
    localStorage.removeItem('gopherbase_access_token');
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
