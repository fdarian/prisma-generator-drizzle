import { defineConfig, env } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/mysql/schema.prisma',
	datasource: { url: env('VITE_MYSQL_DATABASE_URL') },
})
