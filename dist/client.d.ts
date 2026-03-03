import { QueryBuilder } from "./query-builder";
import { SchemaBuilder } from "./schema-builder";
export interface AuthToken {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}
export interface User {
    id: string;
    email: string;
}
declare class GopherBaseClient {
    url: string;
    key: string;
    table: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    constructor(url: string, key: string);
    schema: {
        create: (table: string) => SchemaBuilder;
        drop: (table: string) => Promise<any>;
    };
    auth: {
        signUp: (email: string, password: string) => Promise<AuthToken>;
        signIn: (email: string, password: string) => Promise<AuthToken>;
        signOut: () => Promise<void>;
        getUser: () => Promise<User>;
        refreshSession: () => Promise<AuthToken>;
        getConfig: () => Promise<any>;
        setSession: (accessToken: string, refreshToken: string) => void;
        updateConfig: (config: {
            jwt?: {
                secret: string;
            };
        }) => Promise<any>;
    };
    insert(table: string, data: Record<string, any>): Promise<any>;
    from(table: string): QueryBuilder;
}
export default GopherBaseClient;
