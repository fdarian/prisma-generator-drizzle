import {
	type Mock,
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	spyOn,
	test,
} from 'bun:test'
import path from 'node:path'
import { datasource, generateFromSchema } from './harness'

const SCHEMA = `${datasource('postgres')}
model User {
  id Int @id
  name String
}
`

const MARKER_SCRIPT = path.join(__dirname, 'format-marker.mts')
const MARKER = '// formatted by format-marker.mts\n'

const GENERATING_LOG = 'prisma-generator-drizzle: Generating drizzle schema...'
const FORMAT_FAILED_LOG =
	'prisma-generator-drizzle: Failed to format the generated schema'

// The generator runs `prettier` / `biome` by bare name, so they must resolve from
// the repo however the test runner was launched
const GENERATOR_ROOT = path.join(__dirname, '..', '..')
const FORMATTER_PATH = [
	path.join(GENERATOR_ROOT, 'node_modules', '.bin'),
	path.join(GENERATOR_ROOT, '..', '..', 'node_modules', '.bin'),
	process.env.PATH,
].join(path.delimiter)

let originalPath: string | undefined
beforeAll(() => {
	originalPath = process.env.PATH
	process.env.PATH = FORMATTER_PATH
})
afterAll(() => {
	process.env.PATH = originalPath
})

function generate(config: Record<string, string>, singleFile = true) {
	return generateFromSchema(SCHEMA, { singleFile, config })
}

describe('formatter', () => {
	test.each([true, false])(
		'prettier rewrites the emitted file (singleFile: %s)',
		async (singleFile) => {
			const unformatted = await generate({}, singleFile)
			const formatted = await generate({ formatter: 'prettier' }, singleFile)

			expect(Object.keys(formatted)).toEqual(Object.keys(unformatted))
			for (const name of Object.keys(unformatted)) {
				expect(formatted[name]).not.toBe(unformatted[name])
			}
			// Prettier's default is double quotes with semicolons
			expect(formatted['users.ts'] ?? formatted['schema.ts']).toMatch(/";\n/)
		}
	)

	test.each([true, false])(
		'biome rewrites the emitted file (singleFile: %s)',
		async (singleFile) => {
			const unformatted = await generate({}, singleFile)
			const formatted = await generate({ formatter: 'biome' }, singleFile)

			expect(Object.keys(formatted)).toEqual(Object.keys(unformatted))
			for (const name of Object.keys(unformatted)) {
				expect(formatted[name]).not.toBe(unformatted[name])
			}
		}
	)

	test.each([true, false])(
		'a custom command receives the output path (singleFile: %s)',
		async (singleFile) => {
			const unformatted = await generate({}, singleFile)
			const formatted = await generate(
				{ formatter: `node ${MARKER_SCRIPT}` },
				singleFile
			)

			for (const name of Object.keys(unformatted)) {
				expect(formatted[name]).toBe(MARKER + unformatted[name])
			}
		}
	)

	test('no formatter leaves the output untouched', async () => {
		const files = await generate({})
		for (const content of Object.values(files)) {
			expect(content.startsWith(MARKER)).toBe(false)
		}
	})
})

describe('abortOnFailedFormatting', () => {
	const failingFormatter = `node ${MARKER_SCRIPT} --fail`
	let log: Mock<typeof console.log>
	beforeEach(() => {
		log = spyOn(console, 'log').mockImplementation(() => undefined)
	})
	afterEach(() => log.mockRestore())

	test('true (the default) rejects with the command failure', async () => {
		await expect(generate({ formatter: failingFormatter })).rejects.toThrow(
			`Command failed: ${failingFormatter} `
		)
	})

	test('true, set explicitly, rejects', async () => {
		await expect(
			generate({ formatter: failingFormatter, abortOnFailedFormatting: 'true' })
		).rejects.toThrow(`Command failed: ${failingFormatter} `)
	})

	test('false resolves with the unformatted output still written', async () => {
		const unformatted = await generate({})
		const files = await generate({
			formatter: failingFormatter,
			abortOnFailedFormatting: 'false',
		})

		expect(files).toEqual(unformatted)
	})

	test('false logs the failure when verbose', async () => {
		await generate({
			formatter: failingFormatter,
			abortOnFailedFormatting: 'false',
			verbose: 'true',
		})

		expect(log).toHaveBeenCalledWith(FORMAT_FAILED_LOG)
	})

	// Not a deliberate choice anywhere: the failure goes through the verbose-gated logger
	test('false swallows the failure without a trace when not verbose', async () => {
		await generate({
			formatter: failingFormatter,
			abortOnFailedFormatting: 'false',
		})

		expect(log).not.toHaveBeenCalled()
	})
})

describe('verbose', () => {
	let log: Mock<typeof console.log>
	beforeEach(() => {
		log = spyOn(console, 'log').mockImplementation(() => undefined)
	})
	afterEach(() => log.mockRestore())

	test('logs through the prisma logger', async () => {
		await generate({ verbose: 'true' })

		expect(log).toHaveBeenCalledWith(GENERATING_LOG)
	})

	test('is case-insensitive', async () => {
		await generate({ verbose: 'TRUE' })

		expect(log).toHaveBeenCalledWith(GENERATING_LOG)
	})

	test.each([[{}], [{ verbose: 'false' }]])(
		'is silent with %j',
		async (config) => {
			await generate(config)

			expect(log).not.toHaveBeenCalled()
		}
	)
})
