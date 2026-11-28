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
	execSync(`pnpm exec prisma generate --schema ${getSchemaPath(temp)}`)

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
	execSync(`pnpm exec prisma generate --schema ${getSchemaPath(temp)}`)

	const output = await fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
	expect(output).toContain(
		"normalDate: timestamp('normalDate', { mode: 'date', precision: 3 })"
	)
	expect(output).toContain(
		"stringDate: timestamp('stringDate', { mode: 'string', precision: 3 })"
	)
})

describe('@updatedAt', () => {
	function generate(
		temp: TempDirectory,
		opts: { provider: string; dateMode?: string; documentation?: string }
	) {
		fs.writeFileSync(
			getSchemaPath(temp),
			`datasource db {
				provider = "${opts.provider}"
			}

			generator drizzle {
				provider = "prisma-generator-drizzle"
				${opts.dateMode ? `dateMode = "${opts.dateMode}"` : ''}
				output = "drizzle.ts"
			}

			model User {
				id Int @id
				${opts.documentation ?? ''}
				updatedAt DateTime @updatedAt
			}`
		)
		execSync(`pnpm exec prisma generate --schema ${getSchemaPath(temp)}`)
		return fs.readFileSync(`${temp.basePath}/drizzle.ts`, 'utf-8')
	}

	test('date mode', async () => {
		const temp = await tempHandler.prepare()
		const output = generate(temp, { provider: 'postgresql' })

		expect(output).toContain('.$onUpdate(() => new Date()).notNull()')
	})

	test('string mode', async () => {
		const temp = await tempHandler.prepare()
		const output = generate(temp, {
			provider: 'postgresql',
			dateMode: 'string',
		})

		expect(output).toContain(
			'.$onUpdate(() => new Date().toISOString()).notNull()'
		)
	})

	test('string mode on mysql', async () => {
		const temp = await tempHandler.prepare()
		const output = generate(temp, { provider: 'mysql', dateMode: 'string' })

		expect(output).toContain(
			".$onUpdate(() => new Date().toISOString().replace('T', ' ').replace('Z', '')).notNull()"
		)
	})

	const onUpdateBeforeType =
		/\.\$onUpdate\(\(\) => new Date\(\)\.toISOString\(\)\)\.\$type<.+>\(\)\.notNull\(\)/

	test('keeps `$onUpdate` before a custom `$type`', async () => {
		const temp = await tempHandler.prepare()
		const output = generate(temp, {
			provider: 'postgresql',
			dateMode: 'string',
			documentation:
				'/// drizzle.custom {"$type": "string & { __brand: \'iso\' }"}',
		})

		expect(output).toMatch(onUpdateBeforeType)
		// Drizzle checks the `$onUpdate` callback against the `$type`, so the
		// generated file only type-checks when `$onUpdate` comes first
		execSync(
			`pnpm exec tsc --noEmit --strict --skipLibCheck --moduleResolution node --target esnext ${temp.basePath}/drizzle.ts`
		)
	})

	// The legacy directive's import isn't emitted into single-file output, so
	// only the order is asserted here
	test('keeps `$onUpdate` before a legacy `drizzle.type`', async () => {
		const temp = await tempHandler.prepare()
		const output = generate(temp, {
			provider: 'postgresql',
			dateMode: 'string',
			documentation: '/// drizzle.type ./brand::Iso',
		})

		expect(output).toMatch(onUpdateBeforeType)
	})
})

function getSchemaPath(temp: TempDirectory) {
	return `${temp.basePath}/schema.prisma`
}
