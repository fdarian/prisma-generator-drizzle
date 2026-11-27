import { defineConfig } from 'prisma/config'
import { requireEnv } from './scripts/requireEnv'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: { url: requireEnv('VITE_PG_DATABASE_URL') },
})
