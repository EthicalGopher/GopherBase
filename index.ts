import GopherBaseClient from "./client";
import { QueryBuilder } from "./query-builder";
import { AuthProvider, useAuth, updateAuthConfig } from "./auth";
import type { AuthField } from "./auth";
function createClient(url:string,key:string) {
  return new GopherBaseClient(url,key);
}
export { createClient, GopherBaseClient, QueryBuilder, AuthProvider, useAuth, updateAuthConfig };
export type { AuthField };

