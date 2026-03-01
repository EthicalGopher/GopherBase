class QueryBuilder {
  constructor(url:string,key:string,table:string){
    this.url = url
    this.key = key
    this.table = table
    this.columns = "*"
  }
  select(columns:string="*"){
    this.columns = columns
    return this
  }
  async execute(){
    let query = `${this.url}/rest/v1/${this.table}?select=${this.selected}`;

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

module.exports = {QueryBuilder};
