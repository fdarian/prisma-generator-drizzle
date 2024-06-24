# With Drizzle ORM and Prisma Extension

This example demonstrates how to use [Drizzle ORM](https://orm.drizzle.team/) with the [Prisma](https://www.prisma.io/) extension in a Next.js project.

## Getting Started

1. Install dependencies:

```bash
bun add drizzle-orm@beta 
bun add -D prisma prisma-generator-drizzle
```

2. Generate Drizzle schema
```bash
bun prisma generate
```

3. Define the Drizzle instance with Prisma extension:
```ts
// infra/db.ts
import { PrismaClient } from '@prisma/client'
import { drizzle } from 'drizzle-orm/prisma/pg'

export const db = new PrismaClient().$extends(drizzle())
```

4. Use the Drizzle schema for querying and mutations:
```ts
import { db } from '~/infra/db'
import { users } from './<path-to-generated-drizzle>';

await db.$drizzle.insert(users).values({ email: 'john@doe.com', name: 'John' });
const result = await prisma.$drizzle.select().from(users);
```

## Learn More
To learn more about Drizzle ORM and Prisma, check out the following resources:

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma and Drizzle Integration Guide](https://orm.drizzle.team/docs/prisma)
