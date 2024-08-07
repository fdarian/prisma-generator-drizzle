import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import { type TempDirectory, createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(async () => {
	await tempHandler.cleanup()
})

test('global config', async () => {
	const temp = await tempHandler.prepare()

	fs.writeFileSync(
		getSchemaPath(temp),
		`datasource db {
			provider = "postgresql"
			url      = env("VITE_PG_DATABASE_URL")
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
	execSync(`bun prisma generate --schema ${getSchemaPath(temp)}`)

	const output = fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
	expect(output).toContain(
		"date: timestamp('date', { mode: 'string', precision: 3 })"
	)
})

test('field-level config', async () => {
	const temp = await tempHandler.prepare()

	fs.writeFileSync(
		getSchemaPath(temp),
		`datasource db {
			provider = "postgresql"
			url      = env("VITE_PG_DATABASE_URL")
		}

		generator drizzle { 
			provider = "bunx prisma-generator-drizzle"
			output = "drizzle.ts" 
		} 

		model User { 
			id Int @id
			normalDate DateTime 
			/// drizzle.dateMode string
			stringDate DateTime 
		}`
	)
	execSync(`bun prisma generate --schema ${getSchemaPath(temp)}`)

	const output = await fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
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
