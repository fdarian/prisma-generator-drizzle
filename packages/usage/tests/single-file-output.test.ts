import fs from 'node:fs'
import { createId } from '@paralleldrive/cuid2'
import { $ } from 'bun'

afterAll(() => {
	fs.rmSync('.temp', { recursive: true, force: true })
})

test('generates drizzle.ts', async () => {
	const name = createId()
	writeSchemaWithOutput(name, 'drizzle.ts')
	await $`bun prisma generate --schema .temp/${name}/schema.prisma`.quiet()

	expect(fs.existsSync(`.temp/${name}/drizzle.ts`)).toBe(true)
})

test('generates ./drizzle.ts', async () => {
	const name = createId()
	writeSchemaWithOutput(name, './drizzle.ts')
	await $`bun prisma generate --schema .temp/${name}/schema.prisma`.quiet()

	expect(fs.existsSync(`.temp/${name}/drizzle.ts`)).toBe(true)
})

test('generates sub/drizzle.ts', async () => {
	const name = createId()
	writeSchemaWithOutput(name, 'sub/drizzle.ts')
	await $`bun prisma generate --schema .temp/${name}/schema.prisma`.quiet()

	expect(fs.existsSync(`.temp/${name}/sub/drizzle.ts`)).toBe(true)
})

test('generates ./sub/drizzle.ts', async () => {
	const name = createId()
	writeSchemaWithOutput(name, './sub/drizzle.ts')
	await $`bun prisma generate --schema .temp/${name}/schema.prisma`.quiet()

	expect(fs.existsSync(`.temp/${name}/sub/drizzle.ts`)).toBe(true)
})

test('generates ./sub/multi/drizzle.ts', async () => {
	const name = createId()
	writeSchemaWithOutput(name, './sub/multi/drizzle.ts')
	await $`bun prisma generate --schema .temp/${name}/schema.prisma`.quiet()

	expect(fs.existsSync(`.temp/${name}/sub/multi/drizzle.ts`)).toBe(true)
})

function writeSchemaWithOutput(name: string, output: string) {
	fs.mkdirSync(`.temp/${name}`, { recursive: true })

	const schema = fs
		.readFileSync('./prisma/schema.prisma', { encoding: 'utf-8' })
		.replace(
			'generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n}',
			`generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n  output = "${output}"\n}`
		)
	fs.writeFileSync(`.temp/${name}/schema.prisma`, schema)
}
