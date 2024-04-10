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
			provider = "prisma-generator-drizzle"
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

test('field-level config', async () => {
	const temp = await tempHandler.prepare()

	await Bun.write(
		getSchemaPath(temp),
		`datasource db {
			provider = "postgresql"
			url      = env("PG_DATABASE_URL")
		}

		generator drizzle { 
			provider = "prisma-generator-drizzle"
			output = "drizzle.ts" 
		} 

		model User { 
			id Int @id
			normalDate DateTime 
			/// drizzle.dateMode string
			stringDate DateTime 
		}`
	)
	await $`bun prisma generate --schema ${getSchemaPath(temp)}`.quiet()

	const output = await Bun.file(`${temp.basePath}/drizzle.ts`).text()
	expect(output).toContain(
		"normalDate: timestamp('normalDate', { mode: 'date', precision: 3 })"
	)
	expect(output).toContain(
		"stringDate: timestamp('stringDate', { mode: 'string', precision: 3 })"
	)
})

function getSchemaPath(temp: TempDirectory) {
	return `${temp.basePath}/schema.prisma`
}
