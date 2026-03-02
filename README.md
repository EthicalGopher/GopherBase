# GopherBase

A JavaScript/TypeScript client for GopherBase.

## Installation

```bash
npm install gopherbase
```

## Usage

```typescript
import { createClient } from "gopherbase";

const client = createClient("http://localhost:3000", "your-api-key");
```

## Schema Operations

### Create Table

```typescript
await client.schema.create("users")
  .column("id", "INT").primary().autoIncrement()
  .column("name", "VARCHAR").length(255).notNull()
  .column("email", "VARCHAR").length(255).unique()
  .column("age", "INT").unsigned().nullable()
  .column("status", "VARCHAR").default("active")
  .column("category", "VARCHAR").check("category IN ('a', 'b', 'c')")
  .column("user_id", "INT").references("users", "id").onDelete("cascade").onUpdate("cascade")
  .execute();
```

### Drop Table

```typescript
await client.schema.drop("users");
```

## Query Operations

### Select

```typescript
const users = await client
  .from("users")
  .select("id, name, email")
  .filter("age.gt.18")
  .execute();
```

### Insert

```typescript
await client.insert("users", {
  name: "John",
  email: "john@example.com",
  age: 25
});
```

## API Reference

### createClient(url, key)

Creates a new GopherBase client instance.

- `url` - The GopherBase server URL
- `key` - Your API key

### client.schema.create(table)

Starts a schema creation chain for the specified table.

#### Column Modifiers

- `.column(name, type)` - Define a column
- `.primary()` - Set as primary key
- `.autoIncrement()` - Enable auto-increment
- `.notNull()` - Set NOT NULL constraint
- `.nullable()` - Allow NULL values
- `.unique()` - Set UNIQUE constraint
- `.unsigned()` - Set UNSIGNED (for INT types)
- `.length(n)` - Set column length/precision
- `.default(value)` - Set default value
- `.check(condition)` - Add CHECK constraint
- `.references(table, column)` - Add foreign key reference
- `.onDelete(action)` - Set ON DELETE action (cascade, restrict, set_null)
- `.onUpdate(action)` - Set ON UPDATE action (cascade, restrict)
- `.execute()` - Execute the schema creation

### client.schema.drop(table)

Drops the specified table.

### client.from(table)

Returns a QueryBuilder for the specified table.

#### QueryBuilder Methods

- `.select(columns)` - Select specific columns (default: *)
- `.filter(filter)` - Add filter conditions
- `.execute()` - Execute the query

### client.insert(table, data)

Inserts a record into the specified table.

## Supported Column Types

- INT
- VARCHAR
- TEXT
- BOOLEAN
- TIMESTAMP
- DATE
- TIME
- FLOAT
- DOUBLE
- BIGINT
