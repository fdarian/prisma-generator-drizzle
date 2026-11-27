import { defineConfig } from 'prisma/config'
import { requireEnv } from './scripts/requireEnv'

export default defineConfig({
	schema: 'prisma/mysql/schema.prisma',
	datasource: { url: requireEnv('VITE_MYSQL_DATABASE_URL') },
})
