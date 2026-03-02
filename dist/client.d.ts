import { QueryBuilder } from "./query-builder";
import { SchemaBuilder } from "./schema-builder";
declare class GopherBaseClient {
    url: string;
    key: string;
    table: string | null;
    constructor(url: string, key: string);
    schema: {
        create: (table: string) => SchemaBuilder;
        drop: (table: string) => Promise<any>;
    };
    insert(table: string, data: Record<string, any>): Promise<any>;
    from(table: string): QueryBuilder;
}
export default GopherBaseClient;
