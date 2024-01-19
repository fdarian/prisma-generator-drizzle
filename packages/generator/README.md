# prisma-generator-drizzle

**prisma-generator-drizzle** is a [Prisma](https://www.prisma.io/) generator that lets you generate a [Drizzle](https://orm.drizzle.team/) schema. It is specifically designed for (existing) projects that are using Prisma and want to migrate to Drizzle, or for projects that want to use both Prisma and Drizzle together.

In this version, the focus is still on the query and mutation capabilities of the generated Drizzle schema.

## Features

https://github.com/farreldarian/prisma-generator-drizzle/assets/62016900/35b57135-614e-4e07-920b-9e9a487eb6cb

- 🤝 1:1 Prisma to Drizzle schema generation
- ✨ Compatible with all \*scalars, enums, and \*constraints
- 📦 Supports drizzle relational query
- 🚀 Generates drizzle-specific features like the `.$type<..>()` method

_\*Only supports default scalar for now and more constraints will be added in future_

> This project is still considered as experimental, but you can safely use it for production. Follow the progress on [v1](https://github.com/farreldarian/prisma-generator-drizzle/issues/1).

## Installation

### 1. Install the package

```bash
npm install -D prisma-generator-drizzle
npm install drizzle-orm
```

### 2. Add to your Prisma schema

```prisma
generator drizzle {
  provider = "prisma-generator-drizzle"

  // Specify the output directory
  // output = "../models"
}
```

> See [configuration](#configuration) for more options.

### 3. Run the generator

```bash
prisma generate
```

## Usages

> **Note:** This generator will use the [default Prisma field mapping](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types), meaning any `@db.*` modifiers will be ignored for now.

**prisma-generator-drizzle** aims for 1:1 compatibility with Prisma, this means that you can use the generated Drizzle schema as a complete and familiar drop-in replacement for Prisma client.

In addition to the Prisma features, you can also generate Drizzle-specific features:

> Directive syntax is still experimental, feel free to suggest a better approach.

1. [Generate `.$defaultFn<..>()`](#generate-defaultfn-custom-default-initializer)
2. [Generate `.$type<..>()`](#generate-type-type-customization)

### Configuration

| Key             | Description                       | Default     | Example     |
| --------------- | --------------------------------- | ----------- | ----------- |
| output          | Change the output                 | "./drizzle" | "../models" |
| formatter       | Run prettier after generation     | -           | "prettier"  |
| relationalQuery | Flag to generate relational query | true        | false       |
| verbose         | Flag to enable verbose logging    | -           | true        |

### Generate [`.$defaultFn()`](https://arc.net/l/quote/cmywscsv) Custom Default Initializer

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
import { randomBytes } from 'crypto'
...

export const users = pgTable('User', {
  salt: text('salt')
    .$defaultFn(() => randomBytes(16).toString('hex'))
    .notNull(),
  ...
})
```

### Generate [`.$type<..>()`](https://orm.drizzle.team/docs/column-types/mysql#customizing-column-data-type) Type Customization

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
