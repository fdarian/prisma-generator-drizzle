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
	writeTsConfig(temp.basePath, { moduleResolution: 'NodeNext' })
	writeSchema(temp.basePath, '')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'schema')).toContain("from './users.js'")
	expect(readModule(temp.basePath, 'schema')).toContain(
		"from './posts-relations.js'"
	)
	expect(readModule(temp.basePath, 'posts-relations')).toContain(
		"from './users.js'"
	)
})

test('infers moduleResolution from the tsconfig.json module', async () => {
	const temp = await tempHandler.prepare()
	writeTsConfig(temp.basePath, { module: 'NodeNext' })
	writeSchema(temp.basePath, '')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'schema')).toContain("from './users.js'")
	expect(readModule(temp.basePath, 'posts-relations')).toContain(
		"from './users.js'"
	)
})

test('does not append .js to custom imports that already have an extension', async () => {
	const temp = await tempHandler.prepare()
	writeTsConfig(temp.basePath, { moduleResolution: 'NodeNext' })
	writeSchema(temp.basePath, '')

	generate(temp.basePath)

	const posts = readModule(temp.basePath, 'posts')
	expect(posts.split("'../my-type.js'")).toHaveLength(2)
	expect(posts).not.toContain('.js.js')
})

test('config moduleResolution wins over the tsconfig.json', async () => {
	const temp = await tempHandler.prepare()
	writeTsConfig(temp.basePath, { moduleResolution: 'NodeNext' })
	writeSchema(temp.basePath, 'moduleResolution = "node"')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'schema')).toContain("from './users'")
	expect(readModule(temp.basePath, 'schema')).not.toContain('.js')
	expect(readModule(temp.basePath, 'posts-relations')).not.toContain('.js')
})

test('node16 config adds .js extensions', async () => {
	const temp = await tempHandler.prepare()
	writeSchema(temp.basePath, 'moduleResolution = "Node16"')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'schema')).toContain("from './users.js'")
})

function generate(basePath: string) {
	// The generator finds the tsconfig.json from its own cwd, so it has to be the temp directory
	execSync('bun prisma generate --schema schema.prisma', {
		cwd: path.resolve(basePath),
	})
}

function readModule(basePath: string, name: string) {
	return fs.readFileSync(`${basePath}/drizzle/${name}.ts`, 'utf-8')
}

function writeTsConfig(
	basePath: string,
	compilerOptions: { module?: string; moduleResolution?: string }
) {
	fs.writeFileSync(
		`${basePath}/tsconfig.json`,
		JSON.stringify({ compilerOptions })
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
			/// drizzle.custom { "imports": [{ "name": ["MyType"], "module": "../my-type.js", "type": true }], "$type": "MyType" }
			title String
			author User @relation(fields: [authorId], references: [id])
		}`
	)
}
