import { QueryBuilder } from "./query-builder.ts";
class GopherBaseClient {
  constructor(url:string,key : string) {
    this.url = url
    this.key = key
  }
  from(table:string){
    this.table = table
    return new QueryBuilder(this.url,this.key,this.table)
  }
}
export default GopherBaseClient;
