import { defineConfig } from 'prisma/config'

// Not `env()`: it throws when unset, and `prisma generate` doesn't need a database.
export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: { url: process.env.DATABASE_URL },
})
