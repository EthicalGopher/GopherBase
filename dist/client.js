import { QueryBuilder } from "./query-builder";
class GopherBaseClient {
    constructor(url, key) {
        this.url = url;
        this.table = null;
        this.key = key;
    }
    from(table) {
        this.table = table;
        return new QueryBuilder(this.url, this.key, this.table);
    }
}
export default GopherBaseClient;
