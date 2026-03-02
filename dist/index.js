import GopherBaseClient from "./client";
import { QueryBuilder } from "./query-builder";
function createClient(url, key) {
    return new GopherBaseClient(url, key);
}
export { createClient, GopherBaseClient, QueryBuilder };
