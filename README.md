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
  // Optional: specify the output directory
  // output = "../models"

  // Optional: run prettier
  // prettier = "prettier"
}
```

### 3. Run the generator

```bash
prisma generate
```

## Usages

> **Note:** This generator will use the [default Prisma field mapping](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types), meaning any `@db.*` modifiers will be ignored for now.

**prisma-generator-drizzle** aims for 1:1 compatibility with Prisma, this means that you can use the generated Drizzle schema as a complete and familiar drop-in replacement for Prisma client.

In addition to the Prisma features, you can also generate Drizzle-specific features:

1. [`.$type<..>()`](https://orm.drizzle.team/docs/column-types/mysql#customizing-column-data-type)

   > The syntax is still experimental, feel free to suggest a better approach.

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
