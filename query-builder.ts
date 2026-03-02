class QueryBuilder {
  url: string;
  key: string;
  table: string;
  columns: string;
  filters: string[];
  constructor(url: string, key: string, table: string) {
    this.url = url
    this.key = key
    this.table = table
    this.columns = "*"
    this.filters = []
  }
  select(columns: string = "*") {
    this.columns = columns
    return this
  }
  filter(filter: string) {
    this.filters.push(filter)
    return this
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
