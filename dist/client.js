import { QueryBuilder } from "./query-builder";
import { SchemaBuilder } from "./schema-builder";
class GopherBaseClient {
    constructor(url, key) {
        this.schema = {
            create: (table) => {
                return new SchemaBuilder(this.url, this.key, table);
            },
            drop: async (table) => {
                const res = await fetch(`${this.url}/rest/v1/schema/drop/${table}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${this.key}`,
                    },
                });
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            },
        };
        this.url = url;
        this.table = null;
        this.key = key;
    }
    async insert(table, data) {
        const res = await fetch(`${this.url}/rest/v1/insert/${table}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                data,
            }),
        });
        return res.json();
    }
    from(table) {
        this.table = table;
        return new QueryBuilder(this.url, this.key, this.table);
    }
}
export default GopherBaseClient;
