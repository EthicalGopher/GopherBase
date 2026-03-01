import GopherBaseClient from "./client.ts";
function createClient(url:string,key:string) {
  return new GopherBaseClient(url,key);
}
module.exports = {createClient};
