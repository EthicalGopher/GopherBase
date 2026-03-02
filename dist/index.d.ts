import GopherBaseClient from "./client";
import { QueryBuilder } from "./query-builder";
declare function createClient(url: string, key: string): GopherBaseClient;
export { createClient, GopherBaseClient, QueryBuilder };
