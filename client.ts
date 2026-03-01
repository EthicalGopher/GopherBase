import { QueryBuilder } from "./query-builder";
class GopherBaseClient {
  url: string;
  key: string;
  table: string | null;
  constructor(url:string,key : string) {
    this.url = url
    this.table = null
    this.key = key
  }
  from(table:string){
    this.table = table
    return new QueryBuilder(this.url,this.key,this.table)
  }
}
export default GopherBaseClient;
