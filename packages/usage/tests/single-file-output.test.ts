import { execSync } from 'node:child_process'
import fs from 'node:fs'
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

function writeSchemaWithOutput(name: string, output: string) {
	const schema = fs
		.readFileSync('./prisma/schema.prisma', { encoding: 'utf-8' })
		.replace(
			'generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n}',
			`generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n  output = "${output}"\n}`
		)
	fs.writeFileSync(`.temp/${name}/schema.prisma`, schema)
}
