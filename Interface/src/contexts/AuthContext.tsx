import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const API_BASE = 'http://localhost:8080/rest/v1';

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
    const token = localStorage.getItem('gopherbase_access_token');
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/auth/user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData as User);
        } else {
          const refreshToken = localStorage.getItem('gopherbase_refresh_token');
          if (refreshToken) {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              localStorage.setItem('gopherbase_access_token', data.access_token);
              localStorage.setItem('gopherbase_refresh_token', data.refresh_token);
              const userRes = await fetch(`${API_BASE}/auth/user`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData as User);
              }
            } else {
              localStorage.removeItem('gopherbase_access_token');
              localStorage.removeItem('gopherbase_refresh_token');
            }
          }
        }
      } catch {
        localStorage.removeItem('gopherbase_access_token');
        localStorage.removeItem('gopherbase_refresh_token');
      }
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed');
        throw new Error(data.error || 'Sign in failed');
      }
      localStorage.setItem('gopherbase_access_token', data.access_token);
      localStorage.setItem('gopherbase_refresh_token', data.refresh_token);
      setUser(data.user as User);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        throw new Error(data.error || 'Sign up failed');
      }
      localStorage.setItem('gopherbase_access_token', data.access_token);
      localStorage.setItem('gopherbase_refresh_token', data.refresh_token);
      setUser(data.user as User);
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    }
  };

  const signOut = () => {
    const token = localStorage.getItem('gopherbase_access_token');
    if (token) {
      fetch(`${API_BASE}/auth/signout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('gopherbase_access_token');
    localStorage.removeItem('gopherbase_refresh_token');
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
