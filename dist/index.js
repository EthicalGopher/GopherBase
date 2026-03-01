import GopherBaseClient from "./client";
function createClient(url, key) {
    return new GopherBaseClient(url, key);
}
export { createClient };
