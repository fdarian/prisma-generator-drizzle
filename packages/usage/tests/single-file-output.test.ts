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

function writeSchemaWithOutput(name: string, output: string) {
	if (hasSubFolder(output)) {
		fs.mkdirSync(`.temp/${name}/${getParentPath(output)}`, {
			recursive: true,
		})
	} else {
		fs.mkdirSync(`.temp/${name}`, { recursive: true })
	}

	const schema = fs
		.readFileSync('./prisma/schema.prisma', { encoding: 'utf-8' })
		.replace(
			'generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n}',
			`generator drizzle {\n  provider = "bunx prisma-generator-drizzle"\n  output = "${output}"\n}`
		)
	fs.writeFileSync(`.temp/${name}/schema.prisma`, schema)
}
function getParentPath(output: string) {
	return output.split('/')[0]
}

function hasSubFolder(output: string) {
	return output.split('/').length > 1
}
