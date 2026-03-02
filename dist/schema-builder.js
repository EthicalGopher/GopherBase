class SchemaBuilder {
    constructor(url, key, table) {
        this.columns = [];
        this.url = url;
        this.key = key;
        this.table = table;
    }
    column(name, type) {
        const column = { name, type };
        this.columns.push(column);
        const self = this;
        const chain = {
            primary: () => {
                column.primary = true;
                return chain;
            },
            unique: () => {
                column.unique = true;
                return chain;
            },
            notNull: () => {
                column.notNull = true;
                column.nullable = false;
                return chain;
            },
            nullable: () => {
                column.nullable = true;
                column.notNull = false;
                return chain;
            },
            default: (value) => {
                column.default = value;
                return chain;
            },
            index: () => {
                column.index = true;
                return chain;
            },
            length: (len) => {
                column.length = len;
                return chain;
            },
            unsigned: () => {
                column.unsigned = true;
                return chain;
            },
            autoIncrement: () => {
                column.autoIncrement = true;
                return chain;
            },
            references: (table, columnName) => {
                column.references = {
                    table,
                    column: columnName,
                };
                const refChain = {
                    onDelete: (action) => {
                        column.references.onDelete = action;
                        return refChain;
                    },
                    onUpdate: (action) => {
                        column.references.onUpdate = action;
                        return refChain;
                    },
                    column: (name, type) => {
                        return self.column(name, type);
                    },
                    execute: () => {
                        return self.execute();
                    },
                };
                return refChain;
            },
            check: (condition) => {
                column.check = condition;
                return chain;
            },
            comment: (text) => {
                column.comment = text;
                return chain;
            },
            column: (name, type) => {
                return self.column(name, type);
            },
            execute: () => {
                return self.execute();
            },
        };
        return chain;
    }
    async execute() {
        const res = await fetch(`${this.url}/rest/v1/schema/create/${this.table}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ columns: this.columns }),
        });
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return res.json();
    }
}
export { SchemaBuilder };
