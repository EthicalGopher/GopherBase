type ColumnDefinition = {
  name: string;
  type: string;

  primary?: boolean;
  unique?: boolean;
  notNull?: boolean;
  nullable?: boolean;
  index?: boolean;

  default?: any;
  length?: number;
  unsigned?: boolean;
  autoIncrement?: boolean;

  references?: {
    table: string;
    column: string;
    onDelete?: "cascade" | "restrict" | "set_null";
    onUpdate?: "cascade" | "restrict";
  };

  check?: string;
  comment?: string;
};

class SchemaBuilder {
  private url: string;
  private key: string;
  private table: string;
  private columns: ColumnDefinition[] = [];

  constructor(url: string, key: string, table: string) {
    this.url = url;
    this.key = key;
    this.table = table;
  }

  column(name: string, type: string) {
    const column: ColumnDefinition = { name, type };
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

      default: (value: any) => {
        column.default = value;
        return chain;
      },

      index: () => {
        column.index = true;
        return chain;
      },

      length: (len: number) => {
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

      references: (table: string, columnName: string) => {
        column.references = {
          table,
          column: columnName,
        };

        const refChain = {
          onDelete: (action: "cascade" | "restrict" | "set_null") => {
            column.references!.onDelete = action;
            return refChain;
          },
          onUpdate: (action: "cascade" | "restrict") => {
            column.references!.onUpdate = action;
            return refChain;
          },
          column: (name: string, type: string) => {
            return self.column(name, type);
          },
          execute: () => {
            return self.execute();
          },
        };

        return refChain;
      },

      check: (condition: string) => {
        column.check = condition;
        return chain;
      },

      comment: (text: string) => {
        column.comment = text;
        return chain;
      },

      column: (name: string, type: string) => {
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
export { SchemaBuilder }
