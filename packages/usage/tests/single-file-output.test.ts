import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(() => {
	tempHandler.cleanup()
})

test('generates drizzle.ts', async () => {
	const temp = await tempHandler.prepare()
	writeSchemaWithOutput(temp.name, 'drizzle.ts')
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.existsSync(`.temp/${temp.name}/drizzle.ts`)).toBe(true)
})

test('generates ./drizzle.ts', async () => {
	const temp = await tempHandler.prepare()
	writeSchemaWithOutput(temp.name, './drizzle.ts')
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.existsSync(`.temp/${temp.name}/drizzle.ts`)).toBe(true)
})

test('generates sub/drizzle.ts', async () => {
	const temp = await tempHandler.prepare()
	writeSchemaWithOutput(temp.name, 'sub/drizzle.ts')
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.existsSync(`.temp/${temp.name}/sub/drizzle.ts`)).toBe(true)
})

test('generates ./sub/drizzle.ts', async () => {
	const temp = await tempHandler.prepare()
	writeSchemaWithOutput(temp.name, './sub/drizzle.ts')
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.existsSync(`.temp/${temp.name}/sub/drizzle.ts`)).toBe(true)
})

test('generates ./sub/multi/drizzle.ts', async () => {
	const temp = await tempHandler.prepare()
	writeSchemaWithOutput(temp.name, './sub/multi/drizzle.ts')
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.existsSync(`.temp/${temp.name}/sub/multi/drizzle.ts`)).toBe(true)
})

test('exports a schema containing tables and relations', async () => {
	const temp = await tempHandler.prepare()
	fs.writeFileSync(
		`.temp/${temp.name}/schema.prisma`,
		`datasource db {
			provider = "postgresql"
		}

		generator drizzle {
			provider = "bunx prisma-generator-drizzle"
			output = "drizzle.ts"
		}

		model User {
			id Int @id
			posts Post[]
			tags Tag[]
		}

		model Tag {
			id Int @id
			users User[]
		}

		model Post {
			id Int @id
			authorId Int
			author User @relation(fields: [authorId], references: [id])
		}`
	)
	execSync(`bun prisma generate --schema .temp/${temp.name}/schema.prisma`)

	expect(fs.readFileSync(`.temp/${temp.name}/drizzle.ts`, 'utf-8')).toContain(
		'export const schema = '
	)

	// Importing also proves `schema` is declared after the consts it references
	const generated = await import(
		/* @vite-ignore */ path.resolve(`.temp/${temp.name}/drizzle.ts`)
	)
	expect(Object.keys(generated.schema).sort()).toEqual([
		'posts',
		'postsRelations',
		'tags',
		'tagsRelations',
		'tagsToUsers',
		'tagsToUsersRelations',
		'users',
		'usersRelations',
	])
})

function writeSchemaWithOutput(name: string, output: string) {
	const schema = fs
		.readFileSync('./prisma/schema.prisma', { encoding: 'utf-8' })
		.replace(
			'generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n}',
			`generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n  output = "${output}"\n}`
		)
	fs.writeFileSync(`.temp/${name}/schema.prisma`, schema)
}
