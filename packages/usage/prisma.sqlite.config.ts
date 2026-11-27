import { defineConfig } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/sqlite/schema.prisma',
	datasource: { url: 'file:./prisma/sqlite/test.db' },
})
