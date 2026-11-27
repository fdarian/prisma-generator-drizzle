import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import path from 'node:path'
import { createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(async () => {
	await tempHandler.cleanup()
})

test('auto-detects moduleResolution from the tsconfig.json', async () => {
	const temp = await tempHandler.prepare()
	writeTsConfig(temp.basePath, 'NodeNext')
	writeSchema(temp.basePath, '')

	generate(temp.basePath)

	expect(readSchemaModule(temp.basePath)).toContain("from './users.js'")
	expect(readSchemaModule(temp.basePath)).toContain(
		"from './posts-relations.js'"
	)
})

test('config moduleResolution wins over the tsconfig.json', async () => {
	const temp = await tempHandler.prepare()
	writeTsConfig(temp.basePath, 'NodeNext')
	writeSchema(temp.basePath, 'moduleResolution = "node"')

	generate(temp.basePath)

	expect(readSchemaModule(temp.basePath)).toContain("from './users'")
	expect(readSchemaModule(temp.basePath)).not.toContain('.js')
})

test('node16 config adds .js extensions', async () => {
	const temp = await tempHandler.prepare()
	writeSchema(temp.basePath, 'moduleResolution = "Node16"')

	generate(temp.basePath)

	expect(readSchemaModule(temp.basePath)).toContain("from './users.js'")
})

function generate(basePath: string) {
	// The generator finds the tsconfig.json from its own cwd, so it has to be the temp directory
	execSync('bun prisma generate --schema schema.prisma', {
		cwd: path.resolve(basePath),
	})
}

function readSchemaModule(basePath: string) {
	return fs.readFileSync(`${basePath}/drizzle/schema.ts`, 'utf-8')
}

function writeTsConfig(basePath: string, moduleResolution: string) {
	fs.writeFileSync(
		`${basePath}/tsconfig.json`,
		JSON.stringify({ compilerOptions: { moduleResolution } })
	)
}

function writeSchema(basePath: string, generatorConfig: string) {
	fs.writeFileSync(
		`${basePath}/schema.prisma`,
		`datasource db {
			provider = "postgresql"
			url      = env("VITE_PG_DATABASE_URL")
		}

		generator drizzle {
			provider = "bunx prisma-generator-drizzle"
			output = "drizzle"
			${generatorConfig}
		}

		model User {
			id Int @id
			posts Post[]
		}

		model Post {
			id Int @id
			authorId Int
			author User @relation(fields: [authorId], references: [id])
		}`
	)
}
