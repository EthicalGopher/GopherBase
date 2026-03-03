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

class GopherBaseClient {
  url: string;
  key: string;
  table: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  constructor(url: string, key: string) {
    this.url = url
    this.table = null
    this.key = key
    this.accessToken = null
    this.refreshToken = null
  }
  schema = {
    create: (table: string) => {
      return new SchemaBuilder(this.url, this.key, table);
    },

    drop: async (table: string) => {
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
  }

  auth = {
    signUp: async (email: string, password: string): Promise<AuthToken> => {
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

      const token: AuthToken = await res.json();
      this.accessToken = token.access_token;
      this.refreshToken = token.refresh_token;
      return token;
    },

    signIn: async (email: string, password: string): Promise<AuthToken> => {
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

      const token: AuthToken = await res.json();
      this.accessToken = token.access_token;
      this.refreshToken = token.refresh_token;
      return token;
    },

    signOut: async (): Promise<void> => {
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

    getUser: async (): Promise<User> => {
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

    refreshSession: async (): Promise<AuthToken> => {
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

      const token: AuthToken = await res.json();
      this.accessToken = token.access_token;
      this.refreshToken = token.refresh_token;
      return token;
    },

    getConfig: async (): Promise<any> => {
      const res = await fetch(`${this.url}/rest/v1/auth/config`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },

    setSession: (accessToken: string, refreshToken: string): void => {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    },

    updateConfig: async (config: { jwt?: { secret: string } }): Promise<any> => {
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
  }

  async insert(table: string, data: Record<string, any>) {
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

  from(table: string) {
    this.table = table
    return new QueryBuilder(this.url, this.key, this.table)
  }
}
export default GopherBaseClient;
