import { ReactNode } from "react";
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
interface AuthProviderProps {
    children: ReactNode;
    url: string;
    authKey?: string;
}
export declare function AuthProvider({ children, url, authKey }: AuthProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextType;
export interface AuthField {
    name: string;
    type: string;
    required: boolean;
}
export declare function updateAuthConfig(url: string, config: {
    jwt?: {
        secret: string;
    };
    auth?: {
        fields?: AuthField[];
    };
}): Promise<Response>;
export {};
