class QueryBuilder {
    constructor(url, key, table) {
        this.url = url;
        this.key = key;
        this.table = table;
        this.columns = "*";
        this.filters = [];
    }
    select(columns = "*") {
        this.columns = columns;
        return this;
    }
    filter(filter) {
        this.filters.push(filter);
        return this;
    }
    async execute() {
        let query = `${this.url}/rest/v1/select/${this.table}?select=${this.columns}`;
        if (this.filters.length > 0) {
            query += "&" + this.filters.join("&");
        }
        const res = await fetch(query, {
            headers: {
                Authorization: `Bearer ${this.key}`,
            },
        });
        return res.json();
    }
}
export { QueryBuilder };
