import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext(undefined);
const STORAGE_KEY = "gopherbase_auth";
const getStoredAuth = () => {
    if (typeof window === "undefined")
        return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    }
    catch {
        return null;
    }
};
const storeAuth = (session, user) => {
    if (typeof window === "undefined")
        return;
    if (session && user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, user }));
    }
    else {
        localStorage.removeItem(STORAGE_KEY);
    }
};
export function AuthProvider({ children, url, authKey }) {
    const stored = getStoredAuth();
    const hasStoredAuth = !!stored?.session;
    const [state, setState] = useState({
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
            }
            else {
                storeAuth(null, null);
                setState((prev) => ({ ...prev, user: null, session: null, loading: false }));
            }
        }
        catch (error) {
            storeAuth(null, null);
            setState((prev) => ({ ...prev, user: null, session: null, error: error, loading: false }));
        }
    };
    useEffect(() => {
        if (hasStoredAuth) {
            setState((prev) => ({ ...prev, loading: false }));
        }
        else {
            fetchUser();
        }
    }, []);
    const signUp = async (email, password, metadata) => {
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
            const session = await res.json();
            storeAuth(session, session.user);
            setState({
                user: session.user,
                session,
                loading: false,
                error: null,
            });
        }
        catch (error) {
            setState((prev) => ({ ...prev, loading: false, error: error }));
            throw error;
        }
    };
    const signIn = async (email, password) => {
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
            const session = await res.json();
            storeAuth(session, session.user);
            setState({
                user: session.user,
                session,
                loading: false,
                error: null,
            });
        }
        catch (error) {
            setState((prev) => ({ ...prev, loading: false, error: error }));
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
        }
        catch (error) {
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
        if (!state.session?.refresh_token)
            return;
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
            const session = await res.json();
            storeAuth(session, state.user);
            setState((prev) => ({ ...prev, session }));
        }
        catch (error) {
            setState((prev) => ({ ...prev, error: error }));
            throw error;
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
            ...state,
            signUp,
            signIn,
            signOut,
            refreshSession,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
export function updateAuthConfig(url, config) {
    return fetch(`${url}/rest/v1/auth/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
    });
}
