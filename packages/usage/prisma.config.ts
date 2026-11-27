import { defineConfig, env } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: { url: env('VITE_PG_DATABASE_URL') },
})
