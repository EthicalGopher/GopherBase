declare class SchemaBuilder {
    private url;
    private key;
    private table;
    private columns;
    constructor(url: string, key: string, table: string);
    column(name: string, type: string): {
        primary: () => /*elided*/ any;
        unique: () => /*elided*/ any;
        notNull: () => /*elided*/ any;
        nullable: () => /*elided*/ any;
        default: (value: any) => /*elided*/ any;
        index: () => /*elided*/ any;
        length: (len: number) => /*elided*/ any;
        unsigned: () => /*elided*/ any;
        autoIncrement: () => /*elided*/ any;
        references: (table: string, columnName: string) => {
            onDelete: (action: "cascade" | "restrict" | "set_null") => /*elided*/ any;
            onUpdate: (action: "cascade" | "restrict") => /*elided*/ any;
            column: (name: string, type: string) => /*elided*/ any;
            execute: () => Promise<any>;
        };
        check: (condition: string) => /*elided*/ any;
        comment: (text: string) => /*elided*/ any;
        column: (name: string, type: string) => /*elided*/ any;
        execute: () => Promise<any>;
    };
    execute(): Promise<any>;
}
export { SchemaBuilder };
