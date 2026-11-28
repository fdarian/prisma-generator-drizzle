import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	spyOn,
	test,
} from 'bun:test'
import { datasource, generateFromSchema } from './harness'
import type { Provider } from './harness'

function model(provider: Provider, fields: string) {
	return `${datasource(provider)}
model Item {
  id Int @id
${fields}
}
`
}

function documentedField(provider: Provider, docs: string[], type = 'String') {
	return model(
		provider,
		`${docs.map((line) => `  /// ${line}`).join('\n')}\n  value ${type}`
	)
}

function rejection(message: string) {
	return new Error(message)
}

describe('datasource', () => {
	test.each([
		['sqlserver', '@id'],
		['mongodb', '@id @map("_id") @db.ObjectId'],
	])('unsupported provider %s', async (provider, idAttributes) => {
		const schema = `datasource db {
  provider = "${provider}"
}

model Item {
  id String ${idAttributes}
}
`
		await expect(generateFromSchema(schema)).rejects.toThrow(
			rejection(`Connector ${provider} is not supported`)
		)
	})

	test('no datasource', async () => {
		await expect(
			generateFromSchema('model Item {\n  id Int @id\n}\n')
		).rejects.toThrow(rejection('No datasource specified'))
	})

	// Prisma rejects two datasource blocks itself, so the options are rewritten
	test('multiple datasources', async () => {
		await expect(
			generateFromSchema(model('sqlite', ''), {
				overrideOptions: (options) => ({
					...options,
					datasources: [...options.datasources, ...options.datasources],
				}),
			})
		).rejects.toThrow(rejection('Only one datasource is supported'))
	})
})

describe('output', () => {
	test.each([
		['null', null],
		['empty', { fromEnvVar: null, value: '' }],
	])('missing output (%s)', async (_, output) => {
		await expect(
			generateFromSchema(model('sqlite', ''), {
				overrideOptions: (options) => ({
					...options,
					generator: { ...options.generator, output },
				}),
			})
		).rejects.toThrow(rejection('No output path specified'))
	})
})

const CONFIG_ERROR_HEADER = '[prisma-generator-drizzle] Invalid Config:\n\n'

describe('config', () => {
	test('dateMode outside date | string', async () => {
		await expect(
			generateFromSchema(model('postgres', ''), {
				config: { dateMode: 'bogus' },
			})
		).rejects.toMatchObject({
			name: 'ConfigError',
			message: `${CONFIG_ERROR_HEADER}- dateMode: Invalid type: Expected ("string" | "date") but received "bogus"`,
		})
	})

	test('non-string value', async () => {
		await expect(
			generateFromSchema(model('postgres', ''), {
				overrideOptions: (options) => ({
					...options,
					generator: {
						...options.generator,
						config: { ...options.generator.config, relationalQuery: ['true'] },
					},
				}),
			})
		).rejects.toMatchObject({
			name: 'ConfigError',
			message: `${CONFIG_ERROR_HEADER}- relationalQuery: Invalid type: Expected (string | boolean) but received Array`,
		})
	})

	test('every invalid key is reported', async () => {
		await expect(
			generateFromSchema(model('postgres', ''), {
				overrideOptions: (options) => ({
					...options,
					generator: {
						...options.generator,
						config: {
							...options.generator.config,
							dateMode: 'bogus',
							verbose: ['true'],
						},
					},
				}),
			})
		).rejects.toMatchObject({
			name: 'ConfigError',
			message: `${CONFIG_ERROR_HEADER}- verbose: Invalid type: Expected (string | boolean) but received Array\n- dateMode: Invalid type: Expected ("string" | "date") but received "bogus"`,
		})
	})

	// lib/valibot-schema.ts:7 `BooleanInStr` turns every non-"true" string into false instead of rejecting it
	test.failing(
		'relationalQuery outside true | false is a ConfigError',
		async () => {
			await expect(
				generateFromSchema(model('postgres', ''), {
					config: { relationalQuery: 'bogus' },
				})
			).rejects.toMatchObject({ name: 'ConfigError' })
		}
	)
})

describe('sqlite', () => {
	test('enum', async () => {
		const schema = `${datasource('sqlite')}
enum Role {
  ADMIN
}

model Item {
  id Int @id
  role Role
}
`
		await expect(generateFromSchema(schema)).rejects.toThrow(
			rejection('Prisma does not support enums')
		)
	})

	test('dateMode string', async () => {
		await expect(
			generateFromSchema(model('sqlite', '  at DateTime'), {
				config: { dateMode: 'string' },
			})
		).rejects.toThrow(rejection('Only dateMode `date` is supported for sqlite'))
	})

	test('dateMode string through the field directive', async () => {
		await expect(
			generateFromSchema(
				documentedField('sqlite', ['drizzle.dateMode string'], 'DateTime')
			)
		).rejects.toThrow(rejection('Only dateMode `date` is supported for sqlite'))
	})

	test('Json has no adapter mapping', async () => {
		await expect(
			generateFromSchema(model('sqlite', '  data Json'))
		).rejects.toThrow(rejection('Adapter sqlite does not support Json field'))
	})
})

describe('drizzle.default directive', () => {
	const syntax = '<module>::<function> or <module>::<function> `<code>`'
	function invalid(value: string) {
		return `Invalid drizzle.default directive on field "value": expected "drizzle.default ${syntax}", got ${JSON.stringify(value)}`
	}

	test.each([
		['no module separator', 'newId'],
		['empty', ''],
		['more than one module separator', 'a::b::c'],
		['unclosed backtick code', 'my-module::newId `() => 1'],
		['code followed by more backticks', 'my-module::newId `() => 1` `2`'],
	])('%s', async (_, directive) => {
		await expect(
			generateFromSchema(
				documentedField('postgres', [`drizzle.default ${directive}`.trimEnd()])
			)
		).rejects.toThrow(rejection(invalid(directive)))
	})
})

describe('drizzle.type directive', () => {
	function invalid(value: string, hint: string) {
		return `Invalid drizzle.type directive on field "value": expected "drizzle.type <module>::<Type>", got ${JSON.stringify(value)}. ${hint}`
	}

	test('no module separator', async () => {
		await expect(
			generateFromSchema(documentedField('postgres', ['drizzle.type Address']))
		).rejects.toThrow(
			rejection(
				invalid(
					'Address',
					'For a global or namespace type without a module, use `drizzle.custom { "$type": "<Type>" }`.'
				)
			)
		)
	})

	test('more than one module separator', async () => {
		await expect(
			generateFromSchema(documentedField('postgres', ['drizzle.type a::b::C']))
		).rejects.toThrow(
			rejection(
				invalid(
					'a::b::C',
					'For a global or namespace type without a module, use `drizzle.custom { "$type": "<Type>" }`.'
				)
			)
		)
	})

	test('type expression too complex to find its imports', async () => {
		await expect(
			generateFromSchema(
				documentedField('postgres', ['drizzle.type my-module::{ a: Foo }'])
			)
		).rejects.toThrow(
			rejection(
				invalid(
					'my-module::{ a: Foo }',
					'"{ a: Foo }" is too complex to find its imports. For complex types, use `drizzle.custom` with explicit "imports" and "$type", e.g. `drizzle.custom { "imports": [{ "name": ["<ImportedName>"], "module": "my-module", "type": true }], "$type": "{ a: Foo }" }`'
				)
			)
		)
	})

	test('type expression that imports nothing', async () => {
		await expect(
			generateFromSchema(
				documentedField('postgres', ['drizzle.type my-module::string'])
			)
		).rejects.toThrow(
			rejection(
				invalid(
					'my-module::string',
					'"string" imports nothing from "my-module". For an inline type, use `drizzle.custom { "$type": "string" }`.'
				)
			)
		)
	})
})

describe('drizzle.custom directive', () => {
	test('malformed JSON', async () => {
		await expect(
			generateFromSchema(
				documentedField('postgres', ['drizzle.custom {not json'])
			)
		).rejects.toThrow(
			/^Invalid drizzle\.custom JSON shape on field "value"\n\n— Error:\n.+\n—\n\n— Your Input\ndrizzle\.custom \{not json\n—$/s
		)
	})

	test('trailing comma gets a hint', async () => {
		await expect(
			generateFromSchema(
				documentedField('postgres', ['drizzle.custom { "$type": "Foo", }'])
			)
		).rejects.toThrow(
			/^Invalid drizzle\.custom JSON shape on field "value"\n\n— Error:\n.+\n\nTrailing commas are not allowed in drizzle\.custom JSON\.\n—\n\n— Your Input\ndrizzle\.custom \{ "\$type": "Foo", \}\n—$/s
		)
	})

	test('JSON that is not the directive shape', async () => {
		await expect(
			generateFromSchema(
				documentedField('postgres', ['drizzle.custom { "$type": 1 }'])
			)
		).rejects.toThrow(
			rejection(`Invalid drizzle.custom definition on field "value":

— Error:{
  "nested": {
    "$type": [
      "Invalid type: Expected string but received 1"
    ]
  }
}
—

— Your Input
drizzle.custom { "$type": 1 }
—`)
		)
	})
})

describe('unsupported default value', () => {
	let warn: Mock<typeof console.warn>
	beforeEach(() => {
		warn = spyOn(console, 'warn').mockImplementation(() => undefined)
	})
	afterEach(() => warn.mockRestore())

	test.each(['postgres', 'mysql', 'sqlite'] as const)(
		'uuid() on %s warns and the column is still generated',
		async (provider) => {
			const files = await generateFromSchema(
				model(provider, '  token String @default(uuid())'),
				{ singleFile: true }
			)

			expect(warn).toHaveBeenCalledWith(
				'Unsupported default value: {"name":"uuid","args":[4]} on field token'
			)
			expect(files['schema.ts']).toContain('token:')
		}
	)
})
