declare class QueryBuilder {
    url: string;
    key: string;
    table: string;
    columns: string;
    filters: string[];
    constructor(url: string, key: string, table: string);
    select(columns?: string): this;
    execute(): Promise<any>;
}
export { QueryBuilder };
