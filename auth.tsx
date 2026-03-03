import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface AuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthState {
  user: User | null;
  session: AuthToken | null;
  loading: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  url: string;
  authKey?: string;
}

const STORAGE_KEY = "gopherbase_auth";

interface StoredAuth {
  session: AuthToken;
  user: User;
}

const getStoredAuth = (): StoredAuth | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storeAuth = (session: AuthToken | null, user: User | null) => {
  if (typeof window === "undefined") return;
  if (session && user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, user }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export function AuthProvider({ children, url, authKey }: AuthProviderProps) {
  const stored = getStoredAuth();
  const hasStoredAuth = !!stored?.session;

  const [state, setState] = useState<AuthState>({
    user: stored?.user || null,
    session: stored?.session || null,
    loading: hasStoredAuth,
    error: null,
  });

  const accessToken = state.session?.access_token || authKey;

  const fetchUser = async () => {
    if (!accessToken) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const res = await fetch(`${url}/rest/v1/auth/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const user = await res.json();
        setState((prev) => {
          const newState = {
            ...prev,
            user,
            session: prev.session,
            loading: false,
          };
          storeAuth(newState.session, user);
          return newState;
        });
      } else {
        storeAuth(null, null);
        setState((prev) => ({ ...prev, user: null, session: null, loading: false }));
      }
    } catch (error) {
      storeAuth(null, null);
      setState((prev) => ({ ...prev, user: null, session: null, error: error as Error, loading: false }));
    }
  };

  useEffect(() => {
    if (hasStoredAuth) {
      setState((prev) => ({ ...prev, loading: false }));
    } else {
      fetchUser();
    }
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${url}/rest/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, metadata }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const session: AuthToken & { user: User } = await res.json();
      storeAuth(session, session.user);
      setState({
        user: session.user,
        session,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`${url}/rest/v1/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const session: AuthToken & { user: User } = await res.json();
      storeAuth(session, session.user);
      setState({
        user: session.user,
        session,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fetch(`${url}/rest/v1/auth/signout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error("Sign out error:", error);
    }

    storeAuth(null, null);
    setState({
      user: null,
      session: null,
      loading: false,
      error: null,
    });
  };

  const refreshSession = async () => {
    if (!state.session?.refresh_token) return;

    try {
      const res = await fetch(`${url}/rest/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: state.session.refresh_token }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const session: AuthToken = await res.json();
      storeAuth(session, state.user);
      setState((prev) => ({ ...prev, session }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export interface AuthField {
  name: string;
  type: string;
  required: boolean;
}

export function updateAuthConfig(
  url: string,
  config: {
    jwt?: { secret: string };
    auth?: {
      fields?: AuthField[];
    };
  }
) {
  return fetch(`${url}/rest/v1/auth/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
}
