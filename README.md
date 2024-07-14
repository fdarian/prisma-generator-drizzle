# prisma-generator-drizzle

[![Test](https://github.com/farreldarian/prisma-generator-drizzle/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/farreldarian/prisma-generator-drizzle/actions/workflows/test.yml)

**prisma-generator-drizzle** is a [Prisma](https://www.prisma.io/) generator that allows you to generate [Drizzle](https://orm.drizzle.team/) schema definitions from Prisma schema. It provides 1:1 functionality mapping, allowing you to use Drizzle as a drop-in replacement for querying and mutating your database. 

This tool is ideal for projects transitioning from Prisma to Drizzle, or for those wanting to use both Prisma and Drizzle together. Leveraging the DX of Prisma for defining your schema while still getting the performance benefits and flexibility of Drizzle.

### Features

https://github.com/farreldarian/prisma-generator-drizzle/assets/62016900/35b57135-614e-4e07-920b-9e9a487eb6cb

- 🤝 **Compatibility**: 1:1 Prisma to Drizzle schema generation*
- ✅ **Relational Query Support**: Generates relational query definitions.  
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

This will override any built-in mapping such as `@default(...)` or `@db.*` modifiers.

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


Add `/// drizzle.type <module>::<named-import>` directive above the field definition.

```prisma
model Wallet {
  /// drizzle.type viem::Address
  address     String?
  ...
}
```

This will result to:

```ts
import { Wallet } from 'viem'
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
import { Email } from '../my-type'
...

export const users = pgTable('User', {
  email: text('email').$type<Email>(),
  ...
})
```


## Compatibility

**prisma-generator-drizzle** aims for 1:1 compatibility with Prisma, this means that you can use the generated Drizzle schema as a complete and familiar drop-in replacement for the Prisma client.

> **Note:** This generator will use the [default Prisma field mapping](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types), meaning any `@db.*` modifiers will be ignored for now.


### Postgres
  1. String [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L73)
  2. Boolean [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L89)
  3. Int [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L129) 
  4. BigInt [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L73)
  5. Float [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L121)
  6. Decimal [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L113)
  7. JSON [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L145)
  8. Bytes [\[def\]](https://github.com/fdarian/prisma-generator-drizzle/blob/672f0aa99f3a86f0c0ab138728932f5cb13cfb83/packages/generator/src/lib/adapter/providers/postgres.ts#L97)  

  #### Unsupported:
  1. Unsupported (🏗️ soon)

### MySQL
  > todo docs
### SQLite
  > todo docs


## Examples
1. [with-drizzle-prisma](./examples/with-drizzle-prisma/): using drizzle's prisma extension


## Gotchas
### Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.

By default, the generator will try to find the closest tsconfig from the current working directory to determine the import style, whether to add `.js` or not. When there's no config found, it will use the common import (e.g. `import { users } from './users'`).

You can explicitly set the `moduleResolution` option in the [generator configuration](#configuration).

Check also [the discussion](https://github.com/farreldarian/prisma-generator-drizzle/issues/18)

### SqliteError: NOT NULL constraint failed: \<table-name\>.id

Currently having `@default(autoincrement())` only work for postgres and mysql.
