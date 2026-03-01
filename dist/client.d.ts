import { QueryBuilder } from "./query-builder";
declare class GopherBaseClient {
    url: string;
    key: string;
    table: string | null;
    constructor(url: string, key: string);
    from(table: string): QueryBuilder;
}
export default GopherBaseClient;
