import { QueryBuilder } from "./query-builder";
import { SchemaBuilder } from "./schema-builder";
class GopherBaseClient {
    constructor(url, key) {
        this.schema = {
            create: (table) => {
                return new SchemaBuilder(this.url, this.key, table);
            },
            drop: async (table) => {
                const res = await fetch(`${this.url}/rest/v1/schema/drop/${table}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${this.key}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            },
        };
        this.auth = {
            signUp: async (email, password) => {
                const res = await fetch(`${this.url}/rest/v1/auth/signup`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                const token = await res.json();
                this.accessToken = token.access_token;
                this.refreshToken = token.refresh_token;
                return token;
            },
            signIn: async (email, password) => {
                const res = await fetch(`${this.url}/rest/v1/auth/signin`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                const token = await res.json();
                this.accessToken = token.access_token;
                this.refreshToken = token.refresh_token;
                return token;
            },
            signOut: async () => {
                const res = await fetch(`${this.url}/rest/v1/auth/signout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                });
                this.accessToken = null;
                this.refreshToken = null;
                if (!res.ok) {
                    throw new Error(await res.text());
                }
            },
            getUser: async () => {
                const res = await fetch(`${this.url}/rest/v1/auth/user`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            },
            refreshSession: async () => {
                const res = await fetch(`${this.url}/rest/v1/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ refresh_token: this.refreshToken }),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                const token = await res.json();
                this.accessToken = token.access_token;
                this.refreshToken = token.refresh_token;
                return token;
            },
            getConfig: async () => {
                const res = await fetch(`${this.url}/rest/v1/auth/config`, {
                    method: "GET",
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            },
            setSession: (accessToken, refreshToken) => {
                this.accessToken = accessToken;
                this.refreshToken = refreshToken;
            },
            updateConfig: async (config) => {
                const res = await fetch(`${this.url}/rest/v1/auth/config`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(config),
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            },
        };
        this.url = url;
        this.table = null;
        this.key = key;
        this.accessToken = null;
        this.refreshToken = null;
    }
    async insert(table, data) {
        const res = await fetch(`${this.url}/rest/v1/insert/${table}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken || this.key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                data,
            }),
        });
        return res.json();
    }
    from(table) {
        this.table = table;
        return new QueryBuilder(this.url, this.key, this.table);
    }
}
export default GopherBaseClient;
