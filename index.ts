import GopherBaseClient from "./client";
function createClient(url:string,key:string) {
  return new GopherBaseClient(url,key);
}
export { createClient };
