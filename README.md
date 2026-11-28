# prisma-generator-drizzle

[![Test](https://github.com/farreldarian/prisma-generator-drizzle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/farreldarian/prisma-generator-drizzle/actions/workflows/test.yml)

**prisma-generator-drizzle** is a [Prisma](https://www.prisma.io/) generator that allows you to generate [Drizzle](https://orm.drizzle.team/) schema definitions from Prisma schema. It provides 1:1 functionality mapping, allowing you to use Drizzle as a drop-in replacement for querying and mutating your database. 

This tool is ideal for projects transitioning from Prisma to Drizzle, or for those wanting to use both Prisma and Drizzle together. Leveraging the DX of Prisma for defining your schema while still getting the performance benefits and flexibility of Drizzle.

### Features

https://github.com/farreldarian/prisma-generator-drizzle/assets/62016900/35b57135-614e-4e07-920b-9e9a487eb6cb

- 🤝 **Compatibility**: 1:1 Prisma to Drizzle schema generation*
- ✅ **Relational Query Support**: Generates relational query definitions.  
- 🗂️ **Multi-schema**: Models and enums with `@@schema` on PostgreSQL. See [Compatibility](#multi-schema).
- 📦 **Cutomizability**: Includes tools for customizing drizzle-specific features.

_\*Only supports default scalar for now and more constraints will be added in future_

> Note: This project is still considered experimental, but you can safely use it for production. Follow the progress on [v1](https://github.com/farreldarian/prisma-generator-drizzle/issues/1).


## Getting started

### 1. Install the package

```bash
npm install -D prisma-generator-drizzle
npm install drizzle-orm
```

### 2. Add to your Prisma schema

```prisma
generator drizzle {
  provider = "prisma-generator-drizzle"
  // Specify the output file (or directory)
  output = "./infra/database/drizzle.ts"
}
```

> See [configuration](#configuration) for more options.

### 3. Run the generator

```bash
prisma generate
```


### Learn More
- [Compatibility](#compatibility)
- [Usages](#usages)
  - [configuration](#configuration)
  - [drizzle-kit](#setting-up-drizzle-kit)
  - [relational query](#setting-up-relational-query)
- [Experimental](#experimental)
  - [Customize field with `drizzle.custom`](#customize-field-with-drizzlecustom)
  - [Typed JSON](#typed-json)
- [Compatibility](#compatibility)
- [Examples](#examples) 
- [Gotchas](#gotchas)

## Usages

### Configuration

| Key             | Description                       | Default     | Example     |
| --------------- | --------------------------------- | ----------- | ----------- |
| output          | Generate output directory                 | "./drizzle" | "../models" |
|    | Generate single output file                 |  | "drizzle.ts" |
| formatter       | Run formatter after generation     | -           | "prettier"  |
| relationalQuery | Flag to generate relational query | true        | false       |
| moduleResolution         | Specify the [module resolution](https://www.typescriptlang.org/tsconfig#moduleResolution) that will affect the import style | _*auto_           | nodenext        |
| verbose         | Flag to enable verbose logging    | -           | true        |
| abortOnFailedFormatting | Flag to throw exception when formatting fails | true | false |
| **dateMode | Change the generated mode for date | "date" ||

_* It will find the closest tsconfig from the current working directory. Note that [extends](https://www.typescriptlang.org/tsconfig#extends) is not supported_

_**Does not work with sqlite_

### Setting up [relational query](https://orm.drizzle.team/docs/rqb)

```ts
import { drizzle } from 'drizzle-orm/node-postgres'

// `schema` contains all table and relation definitions
import { schema } from 'prisma/drizzle/schema'

const client = ... // database client
const db = drizzle(client, { schema })
```

### Setting up [drizzle-kit](https://orm.drizzle.team/kit-docs/overview)

Use the glob pattern (see [example 3](https://orm.drizzle.team/kit-docs/conf#schema-files-paths)) to reference the generated table definitions.

```ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  // Using the default output path
  schema: './prisma/drizzle/*',
})
```

## Experimental

These syntaxes might change in the future, we encourage your feedback.

We will make sure to keep the syntaxes compatible with future versions.

### Customize field with `drizzle.custom` 

Customize the generated field definition using `drizzle.custom` directive in a json format.

This will override any `@default(...)` mapping. It is applied on top of the column generated from `@db.*`, so the native type is kept.

Available options:

```prisma
model Table {
  /// drizzle.custom {
  ///   "imports": [{ "name": ["UserId"], "module": "~/models/user", "type": true }],
  ///   "$type": "UserId",
  ///   "default": "() => 1",
  ///   "field": { "mode": "number" }
  /// }
  column BigInt
}
```

1. `imports`: Specify the import path for the custom code.

   Array of imports that will be added to each schema file.

   - named import: `[{ "name": ["<exported-names>"], "module": "<path-or-module>>" }, ...]`
   - default import: `[{ "name": "<exported-default>", "module": "<path-or-module>>" }, ...]` 
   - type import: `[{ ..., "type": true }, ...]`

   [[definition]](https://github.com/fdarian/prisma-generator-drizzle/blob/e25318bf38ad4d20bb3da4c64f0e1b275d4b007f/packages/generator/src/lib/adapter/fields/directives/custom.ts#L38)
  

2. `$type`: Specify the type to use for the field.
3. `default`: Specify the default value for the field.
4. 🏗️ `field`: Specify the field options.

> NOTE: All options are optional. Items marked with 🏗️ are incomplete

### Generate [`.$defaultFn()`](https://arc.net/l/quote/cmywscsv) Custom Default Initializer

> ⚠️ This may potentially be removed and replaced by `drizzle.custom` directive

Add `/// drizzle.default <module>::<named-function-import>` directive above the field definition to generate a custom default initializer.

> NOTE: This will override any `@default(...)` attribute from the schema.

```prisma
model User {
  /// drizzle.default @paralleldrive/cuid2::createId
  id     String @id
  ...
}
```

This will result to:

```ts
import { createId } from '@paralleldrive/cuid2'
...

export const users = pgTable('User', {
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),
  ...
})
```

Or with a custom code

```prisma
model User {
  /// drizzle.default crypto::randomBytes `() => randomBytes(16).toString('hex')`
  salt      String?
  ...
}
```

```ts
import { randomBytes } from 'node:crypto'
...

export const users = pgTable('User', {
  salt: text('salt')
    .$defaultFn(() => randomBytes(16).toString('hex'))
    .notNull(),
  ...
})
```

### Generate [`.$type<..>()`](https://orm.drizzle.team/docs/column-types/mysql#customizing-column-data-type) Type Customization


> ⚠️ This may potentially be removed and replaced by `drizzle.custom` directive


Add `/// drizzle.type <module>::<Type>` directive above the field definition.

```prisma
model Wallet {
  /// drizzle.type viem::Address
  address     String?
  ...
}
```

This will result to:

```ts
import type { Address } from 'viem'
...

export const wallets = pgTable('Wallet', {
  address: text('address').$type<Address>(),
  ...
})
```

Or with a relative import

```prisma
model User {
  /// drizzle.type ../my-type::Email
  email     String?
  ...
}
```

```ts
import type { Email } from '../my-type'
...

export const users = pgTable('User', {
  email: text('email').$type<Email>(),
  ...
})
```

### Typed JSON

Type a `Json` field with the same directives. The generated column gets `.$type<..>()`, so queries return your type instead of `unknown`.

Import the type with `drizzle.type`. After `::` write a type name, optionally with generics, `[]`, `['key']`, `|` or `&`. It is used as written, and the names in it are imported from the module (built-in types such as `Array` and `Record`, and primitives such as `string`, are not).

```prisma
model User {
  /// drizzle.type ../my-type::Settings
  settings  Json
}
```

```ts
import type { Settings } from '../my-type'
...

export const users = pgTable('User', {
  settings: jsonb('settings').$type<Settings>().notNull(),
})
```

The type is the column's whole type and nothing is appended to it, so for a list field write the array yourself. `Array<Settings>` and `Settings['key']` work too.

```prisma
model User {
  /// drizzle.type ../my-type::Settings[]
  history  Json[]
}
```

```ts
import type { Settings } from '../my-type'
...

  history: jsonb('history').array().$type<Settings[]>().notNull(),
```

For an inline type with nothing to import, use `drizzle.custom`.

```prisma
model Report {
  /// drizzle.custom { "$type": "{ month: string, min: number }[]" }
  usage  Json
}
```

```ts
  usage: jsonb('usage').$type<{ month: string, min: number }[]>().notNull(),
```

> NOTE: The `drizzle.custom` value is strict JSON, trailing commas are not allowed.

For anything more complex, such as an object type that uses imported names, use `drizzle.custom` with `imports` and `$type`.

```prisma
model Report {
  /// drizzle.custom {
  ///   "imports": [{ "name": ["Item"], "module": "../my-type", "type": true }],
  ///   "$type": "{ items: Item[] }"
  /// }
  data  Json
}
```

```ts
import type { Item } from '../my-type'
...

  data: jsonb('data').$type<{ items: Item[] }>().notNull(),
```


## Compatibility

**prisma-generator-drizzle** aims for 1:1 compatibility with Prisma, this means that you can use the generated Drizzle schema as a complete and familiar drop-in replacement for the Prisma client.

| Dependency  | Version            | Source                                              |
| ----------- | ------------------ | --------------------------------------------------- |
| Prisma      | `7.10.1` (pinned)  | `prisma` and `@prisma/generator-helper`             |
| drizzle-orm | `^0.45.4` (tested) | the `usage` test project; no peer range is declared |

This generator follows the [default Prisma field mapping](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types) and maps native `@db.*` attributes to the matching Drizzle column where one exists. Native types without a Drizzle equivalent fall back to the default column of their scalar.

Arguments carry over to the column (`@db.VarChar(255)` becomes `varchar('col', { length: 255 })`) and are omitted when the attribute has none. `DateTime` columns respect [`dateMode`](#configuration) unless noted. `Unsupported` fields are not supported yet.

### Multi-schema

Models and enums with `@@schema("name")` are supported on PostgreSQL and CockroachDB (which uses the Postgres adapter). The generator emits a `pg-schemas.ts` module with one `pgSchema` per non-`public` schema:

```ts
export const authSchema = pgSchema('auth')
```

Tables and enums in that schema are declared with `authSchema.table(...)` and `authSchema.enum(...)`. Models and enums in `public` keep using `pgTable` and `pgEnum`.

Implicit many-to-many join tables follow Prisma and live in the schema of the model whose name sorts first.

MySQL and SQLite don't support `schemas` / `@@schema` in Prisma, so there is nothing to generate for them.

### Postgres

Default mapping, without `@db.*`:

| Prisma | Drizzle |
| --- | --- |
| `String` | `text` |
| `Boolean` | `boolean` |
| `Int` | `integer` (`serial` with `autoincrement()`) |
| `BigInt` | `bigint` (`bigserial` with `autoincrement()`) |
| `Float` | `doublePrecision` |
| `Decimal` | `decimal` (precision 65, scale 30) |
| `DateTime` | `timestamp` (precision 3) |
| `Json` | `jsonb` |
| `Bytes` | `bytea` through a custom type |
| `enum` | `pgEnum` |

Native types:

| Prisma | `@db.*` | Drizzle |
| --- | --- | --- |
| `String` | `VarChar(n)` | `varchar` |
| `String` | `Char(n)` | `char` |
| `String` | `Uuid` | `uuid` |
| `String` | `Inet` | `inet` |
| `Int` | `SmallInt` | `smallint` (`smallserial` with `autoincrement()`) |
| `Float` | `Real` | `real` |
| `Decimal` | `Decimal(p, s)` | `decimal` |
| `DateTime` | `Timestamp(x)` | `timestamp` |
| `DateTime` | `Timestamptz(x)` | `timestamp` with `withTimezone` |
| `DateTime` | `Date` | `date` |
| `DateTime` | `Time(x)` | `time` (no `dateMode`, values are strings) |
| `DateTime` | `Timetz(x)` | `time` with `withTimezone` (no `dateMode`, values are strings) |
| `Json` | `Json` | `json` |

Native types that match the default column (`Text`, `Integer`, `BigInt`, `DoublePrecision`, `JsonB`, `ByteA`) are unchanged. `Bit`, `VarBit`, `Xml`, `Citext`, `Oid` and `Money` fall back to the default column.

### MySQL

Default mapping, without `@db.*`:

| Prisma | Drizzle |
| --- | --- |
| `String` | `text` |
| `Boolean` | `boolean` |
| `Int` | `int` |
| `BigInt` | `bigint` |
| `Float` | `float` |
| `Decimal` | `decimal` (precision 65, scale 30) |
| `DateTime` | `datetime` (fsp 3) |
| `Json` | `json` |
| `Bytes` | `longblob` through a custom type |
| `enum` | `mysqlEnum` |

Native types:

| Prisma | `@db.*` | Drizzle |
| --- | --- | --- |
| `String` | `VarChar(n)` | `varchar` |
| `String` | `Char(n)` | `char` |
| `String` | `TinyText` / `MediumText` / `LongText` | `tinytext` / `mediumtext` / `longtext` |
| `Int` | `UnsignedInt` | `int` with `unsigned` |
| `Int` | `SmallInt` / `UnsignedSmallInt` | `smallint` / `smallint` with `unsigned` |
| `Int` | `MediumInt` / `UnsignedMediumInt` | `mediumint` / `mediumint` with `unsigned` |
| `Int` | `TinyInt` / `UnsignedTinyInt` | `tinyint` / `tinyint` with `unsigned` |
| `Int` | `Year` | `year` |
| `BigInt` | `UnsignedBigInt` | `bigint` with `unsigned` |
| `Float` | `Double` | `double` |
| `Decimal` | `Decimal(p, s)` | `decimal` |
| `DateTime` | `DateTime(x)` | `datetime` |
| `DateTime` | `Timestamp(x)` | `timestamp` |
| `DateTime` | `Date` | `date` |
| `DateTime` | `Time(x)` | `time` (no `dateMode`, values are strings) |

Native types that match the default column (`Text`, `Int`, `BigInt`, `Float`, `Json`, `LongBlob`, and `TinyInt(1)` on `Boolean`) are unchanged. `Bit`, `Binary`, `VarBinary`, `TinyBlob`, `Blob` and `MediumBlob` fall back to the default column, because Drizzle's `binary` and `varbinary` return strings rather than `Buffer`.

With `@default(now())`, `Date` and `Time` columns use `(CURRENT_DATE)` and `(CURRENT_TIME(x))`, since MySQL rejects `CURRENT_TIMESTAMP` there.

### SQLite

SQLite has no `@db.*` attributes, so only the default mapping applies:

| Prisma | Drizzle |
| --- | --- |
| `String` | `text` |
| `Boolean` | `integer` (boolean mode) |
| `Int` | `integer` |
| `BigInt` | `integer` through a custom type |
| `Float` | `real` |
| `Decimal` | `decimal` through a custom type |
| `DateTime` | `integer` (timestamp mode, `dateMode` must be `date`) |
| `Bytes` | `blob` (buffer mode) |

`Json` and enums are not supported.


## Examples
1. [with-drizzle-prisma](./examples/with-drizzle-prisma/): using drizzle's prisma extension


## Gotchas
### Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.

By default, the generator will try to find the closest tsconfig from the current working directory to determine the import style, whether to add `.js` or not. When there's no config found, it will use the common import (e.g. `import { users } from './users'`).

When `moduleResolution` isn't set in the tsconfig, `compilerOptions.module` (`node16`, `nodenext`, `node18`, `node20`) is used to infer it.

You can explicitly set the `moduleResolution` option in the [generator configuration](#configuration).

Check also [the discussion](https://github.com/farreldarian/prisma-generator-drizzle/issues/18)

### SqliteError: NOT NULL constraint failed: \<table-name\>.id

Currently having `@default(autoincrement())` only work for postgres and mysql.
