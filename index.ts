import GopherBaseClient from "./client";
import { QueryBuilder } from "./query-builder";
function createClient(url:string,key:string) {
  return new GopherBaseClient(url,key);
}
export { createClient, GopherBaseClient, QueryBuilder };
