import GopherBaseClient from "./client";
import { QueryBuilder } from "./query-builder";
import { AuthProvider, useAuth, updateAuthConfig } from "./auth";
function createClient(url, key) {
    return new GopherBaseClient(url, key);
}
export { createClient, GopherBaseClient, QueryBuilder, AuthProvider, useAuth, updateAuthConfig };
