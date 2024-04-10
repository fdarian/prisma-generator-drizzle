import { $ } from 'bun'
import { type TempDirectory, createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(async () => {
	await tempHandler.cleanup()
})

test('global config', async () => {
	const temp = await tempHandler.prepare()

	await Bun.write(
		getSchemaPath(temp),
		`datasource db {
			provider = "postgresql"
			url      = env("PG_DATABASE_URL")
		}

		generator drizzle { 
			provider = "bunx prisma-generator-drizzle"
			dateMode = "string"
			output = "drizzle.ts" 
		} 

		model User { 
			id Int @id
			date DateTime 
		}`
	)
	await $`bun prisma generate --schema ${getSchemaPath(temp)}`.quiet()

	const output = await Bun.file(`${temp.basePath}/drizzle.ts`).text()
	expect(output).toContain(
		"date: timestamp('date', { mode: 'string', precision: 3 })"
	)
})

function getSchemaPath(temp: TempDirectory) {
	return `${temp.basePath}/schema.prisma`
}
