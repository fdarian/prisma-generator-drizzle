import { describe, expect, test } from 'bun:test'
import {
	type Provider,
	datasource,
	expectSchemaToMatchSnapshots,
	generateFromSchema,
} from '../harness'

const providers: Provider[] = ['postgres', 'mysql', 'sqlite']

// Imported by the directives below; the hand-written stub is committed at
// `__snapshots__/directive-stubs.ts` so the snapshot typecheck resolves it
const STUBS = '../../directive-stubs'

// The sqlite adapter has no Json column
function typeDirectives(provider: Provider) {
	return `
model TypedFields {
  id Int @id

  /// A branded email address
  /// drizzle.type ${STUBS}::Email
  email String

  /// drizzle.type node:crypto::UUID
  externalId String?

${
	provider === 'sqlite'
		? ''
		: `
  /// drizzle.type ${STUBS}::Settings
  settings Json

  /// drizzle.type ${STUBS}::Settings[]
  history Json

  /// drizzle.type ${STUBS}::Record<string, Item>
  items Json
`
}}
`
}

const defaultDirectives = `
model DefaultFns {
  id Int @id

  /// drizzle.default ${STUBS}::makeId
  token String

  /// drizzle.default node:crypto::randomUUID
  uuid String

  /// drizzle.default node:crypto::randomBytes \`() => randomBytes(16).toString('hex')\`
  salt String

  /// Replaces the schema default
  /// drizzle.default ${STUBS}::makeId
  overridden String @default("fallback")

  /// drizzle.default ${STUBS}::makeId
  optionalToken String?
}
`

function customDirectives(provider: Provider) {
	return `
model CustomFields {
  id Int @id

  /// drizzle.custom {
  ///   "imports": [{ "name": ["Email"], "module": "${STUBS}", "type": true }],
  ///   "$type": "Email"
  /// }
  email String

  /// drizzle.custom { "imports": [{ "name": "slugify", "module": "${STUBS}" }], "default": "() => slugify('Untitled')" }
  slug String

  /// drizzle.custom { "imports": [{ "name": ["UserId"], "module": "${STUBS}", "type": true }], "$type": "UserId", "field": { "mode": "number" } }
  userId BigInt
${
	provider === 'sqlite'
		? ''
		: `
  /// drizzle.custom { "$type": "{ month: string, min: number }[]" }
  usage Json

  /// drizzle.custom {
  ///   "imports": [{ "name": ["Item"], "module": "${STUBS}", "type": true }],
  ///   "$type": "{ items: Item[] }",
  ///   "default": "() => ({ items: [] })"
  /// }
  data Json
`
}}
`
}

const dateModeDirectives: Record<Provider, string> = {
	postgres: dateModeModel(['date', 'string']),
	mysql: dateModeModel(['date', 'string']),
	// SQLite columns are always dates
	sqlite: dateModeModel(['date']),
}

function dateModeModel(modes: ('date' | 'string')[]) {
	return `
model DateModes {
  id          Int      @id
  defaultMode DateTime
${modes
	.map(
		(mode) => `
  /// drizzle.dateMode ${mode}
  as${mode === 'date' ? 'Date' : 'String'} DateTime

  /// drizzle.dateMode ${mode}
  created${mode === 'date' ? 'Date' : 'String'} DateTime @default(now())

  /// drizzle.dateMode ${mode}
  updated${mode === 'date' ? 'Date' : 'String'} DateTime @updatedAt
`
	)
	.join('')}}
`
}

describe('directives', () => {
	test.each(providers)('%s drizzle.type', async (provider) => {
		await expectSchemaToMatchSnapshots(
			datasource(provider) + typeDirectives(provider),
			{
				provider,
				fixture: 'directive-type',
			}
		)
	})

	test.each(providers)('%s drizzle.default', async (provider) => {
		await expectSchemaToMatchSnapshots(
			datasource(provider) + defaultDirectives,
			{ provider, fixture: 'directive-default' }
		)
	})

	test.each(providers)('%s drizzle.custom', async (provider) => {
		await expectSchemaToMatchSnapshots(
			datasource(provider) + customDirectives(provider),
			{ provider, fixture: 'directive-custom' }
		)
	})

	test.each(providers)('%s drizzle.dateMode', async (provider) => {
		await expectSchemaToMatchSnapshots(
			datasource(provider) + dateModeDirectives[provider],
			{ provider, fixture: 'directive-date-mode' }
		)
	})

	// createField.ts:97-98 adds `.notNull()` when `hasDefaultFn` is set, even for an optional field
	test.failing.each(providers)(
		'%s optional field with drizzle.default is not notNull',
		async (provider) => {
			const files = await generateFromSchema(`${datasource(provider)}
model Optional {
  id Int @id

  /// drizzle.default ${STUBS}::makeId
  token String?
}
`)
			expect(files['optionals.ts']).not.toMatch(/token.*\.notNull\(\)/)
		}
	)

	// Same `hasDefaultFn` branch as above, reached through drizzle.custom `default`
	test.failing.each(providers)(
		'%s optional field with drizzle.custom default is not notNull',
		async (provider) => {
			const files = await generateFromSchema(`${datasource(provider)}
model Optional {
  id Int @id

  /// drizzle.custom { "default": "() => 'x'" }
  token String?
}
`)
			expect(files['optionals.ts']).not.toMatch(/token.*\.notNull\(\)/)
		}
	)
})
