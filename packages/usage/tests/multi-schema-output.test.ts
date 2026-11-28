import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

afterAll(async () => {
	await tempHandler.cleanup()
})

test('single-file output declares the schemas before their first use', async () => {
	const temp = await tempHandler.prepare()
	writeFixture(temp.basePath, 'output = "drizzle.ts"')

	generate(temp.basePath)

	const code = fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
	expect(code).not.toContain('./pg-schemas')
	expect(code.indexOf("authSchema = pgSchema('auth')")).toBeGreaterThan(-1)
	expect(code.indexOf("blogSchema = pgSchema('blog')")).toBeGreaterThan(-1)
	expect(code.indexOf('pgSchema(')).toBeLessThan(code.indexOf('Schema.table('))
	expect(code.indexOf('pgSchema(')).toBeLessThan(code.indexOf('Schema.enum('))

	// Importing proves the constants are declared before the tables that use them
	const generated = await import(
		/* @vite-ignore */ path.resolve(`${temp.basePath}/drizzle.ts`)
	)
	expect(generated.users).toBeDefined()
	expect(generated.schema).toBeDefined()
})

test('nodenext imports pg-schemas with a .js extension', async () => {
	const temp = await tempHandler.prepare()
	writeFixture(
		temp.basePath,
		'output = "drizzle"\nmoduleResolution = "nodenext"'
	)

	generate(temp.basePath)

	for (const module of ['users', 'posts', 'role-enum', 'post-status-enum']) {
		expect(readModule(temp.basePath, module)).toContain(
			"from './pg-schemas.js'"
		)
	}
	expect(readModule(temp.basePath, 'pg-schemas')).not.toContain('./')
})

test('node16 imports pg-schemas with a .js extension', async () => {
	const temp = await tempHandler.prepare()
	writeFixture(temp.basePath, 'output = "drizzle"\nmoduleResolution = "node16"')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'users')).toContain("from './pg-schemas.js'")
})

test('classic resolution imports pg-schemas without an extension', async () => {
	const temp = await tempHandler.prepare()
	writeFixture(temp.basePath, 'output = "drizzle"\nmoduleResolution = "node"')

	generate(temp.basePath)

	expect(readModule(temp.basePath, 'users')).toContain("from './pg-schemas'")
})

function generate(basePath: string) {
	execSync('bun prisma generate --schema schema.prisma', {
		cwd: path.resolve(basePath),
	})
}

function readModule(basePath: string, name: string) {
	return fs.readFileSync(`${basePath}/drizzle/${name}.ts`, 'utf-8')
}

function writeFixture(basePath: string, generatorConfig: string) {
	const schema = fs
		.readFileSync('./prisma/multi-schema/schema.prisma', 'utf-8')
		.replace(
			'provider = "bunx prisma-generator-drizzle"\n',
			`provider = "bunx prisma-generator-drizzle"\n  ${generatorConfig}\n`
		)
	fs.writeFileSync(`${basePath}/schema.prisma`, schema)
}
