# With Drizzle ORM and Prisma Extension

This example demonstrates how to use [Drizzle ORM](https://orm.drizzle.team/) with the [Prisma](https://www.prisma.io/) extension in a Next.js project, on Prisma 7.

## Getting Started

Inside this repo the example uses the workspace generator, so build it first: `pnpm turbo build --filter prisma-generator-drizzle` (or just run `pnpm turbo generate`).

1. Install dependencies:

```bash
pnpm add drizzle-orm @prisma/client @prisma/adapter-pg pg
pnpm add -D prisma prisma-generator-drizzle @types/pg
```

2. Add the generator to `prisma/schema.prisma`. Prisma 7 keeps the connection URL out of the schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator drizzle {
  provider = "prisma-generator-drizzle"
  output   = "./drizzle.ts"
}

datasource db {
  provider = "postgresql"
}
```

3. Point `prisma.config.ts` at your database via `DATABASE_URL`:

```ts
import { defineConfig } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: { url: process.env.DATABASE_URL },
})
```

4. Push the schema and generate the Drizzle schema (written to `prisma/drizzle.ts`):

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/exampledb
pnpm prisma db push
pnpm prisma generate
```

5. Define the Drizzle instance with the Prisma extension. Prisma 7 needs a driver adapter:
```ts
// src/infra/db.ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { drizzle } from 'drizzle-orm/prisma/pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const db = new PrismaClient({ adapter }).$extends(drizzle())
```

6. Use the Drizzle schema for querying and mutations:
```ts
// src/app/page.tsx
import { db } from '@/infra/db'
import { users } from '../../prisma/drizzle'

await db.$drizzle.insert(users).values({ email: 'john@doe.com', name: 'John' })
const result = await db.$drizzle.select().from(users)
```

## Learn More
To learn more about Drizzle ORM and Prisma, check out the following resources:

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma and Drizzle Integration Guide](https://orm.drizzle.team/docs/prisma)
