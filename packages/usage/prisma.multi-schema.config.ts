import { defineConfig, env } from 'prisma/config'
import { getMultiSchemaDatabaseUrl } from './src/lib/multi-schema-url'

export default defineConfig({
	schema: 'prisma/multi-schema/schema.prisma',
	datasource: {
		url: getMultiSchemaDatabaseUrl(env('VITE_PG_DATABASE_URL')),
	},
})
