import { beforeAll, describe, expect, test } from 'bun:test'
import { getSchema } from '@mrleebo/prisma-ast'
import type { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import { initializeGenerator } from '~/shared/generator-context'
import { getDefaultForeignKeyName, getForeignKeys } from './foreign-keys'
import { createSchema } from './schema/schema'
import { createSchemaModel } from './schema/schema-model'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

type TableDeclaration = typeof import(
	'../adapter/declarations/generateTableDeclaration'
)

let createForeignKeyEntry: TableDeclaration['createForeignKeyEntry']
let generateTableDeclaration: TableDeclaration['generateTableDeclaration']
let mysqlAdapter: typeof import('../adapter/providers/mysql').mysqlAdapter
let postgresAdapter: typeof import(
	'../adapter/providers/postgres'
).postgresAdapter
let sqliteAdapter: typeof import('../adapter/providers/sqlite').sqliteAdapter

// The adapters read the generator context while their modules load, so they must be imported after initialization
beforeAll(async () => {
	const declaration = await import(
		'../adapter/declarations/generateTableDeclaration'
	)
	createForeignKeyEntry = declaration.createForeignKeyEntry
	generateTableDeclaration = declaration.generateTableDeclaration
	mysqlAdapter = (await import('../adapter/providers/mysql')).mysqlAdapter
	postgresAdapter = (await import('../adapter/providers/postgres'))
		.postgresAdapter
	sqliteAdapter = (await import('../adapter/providers/sqlite')).sqliteAdapter
})

function scalar(name: string, isRequired = true): DMMF.Field {
	return {
		name,
		kind: 'scalar',
		type: 'String',
		isRequired,
		isList: false,
		isId: name === 'id',
		isUnique: false,
		isReadOnly: false,
		hasDefaultValue: false,
		isGenerated: false,
		isUpdatedAt: false,
	}
}

function relation(
	name: string,
	type: string,
	from: string[],
	to: string[]
): DMMF.Field {
	return {
		...scalar(name),
		kind: 'object',
		type,
		relationName: `${name}_relation`,
		relationFromFields: from,
		relationToFields: to,
	}
}

function dmmfModel(name: string, fields: DMMF.Field[]): DMMF.Model {
	return {
		name,
		dbName: null,
		schema: null,
		fields,
		uniqueFields: [],
		uniqueIndexes: [],
		primaryKey: null,
	}
}

function setup(source: string, models: DMMF.Model[], modelName: string) {
	const astSchema = getSchema(source)
	const schema = createSchema({
		astSchema,
		dmmf: { datamodel: { models, enums: [], types: [], indexes: [] } },
	})
	const dmmf = models.find((m) => m.name === modelName)
	const astModel = astSchema.list.find(
		(block) => block.type === 'model' && block.name === modelName
	)
	if (dmmf == null || astModel?.type !== 'model') {
		throw new Error(`Model ${modelName} not found`)
	}
	return { schema, model: createSchemaModel({ dmmfModel: dmmf, astModel }) }
}

const target = (name: string) => dmmfModel(name, [scalar('id')])

describe('getForeignKeys', () => {
	test('throws when the target model is unknown and not ignored', () => {
		const { schema, model } = setup(
			'model Post {\n id String @id\n authorId String\n author Author @relation(fields: [authorId], references: [id])\n}',
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model, sqliteAdapter)).toThrow(
			/unknown model Author/
		)
	})

	test('skips a relation whose local column is @ignore d', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String @ignore
				author Author @relation(fields: [authorId], references: [id])
			}
			model Author {
				id String @id
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(getForeignKeys(schema, model, sqliteAdapter)).toEqual([])
	})

	test('throws when a local column is missing and not @ignore d', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id])
			}
			model Author {
				id String @id
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model, sqliteAdapter)).toThrow(
			/references unknown fields authorId/
		)
	})

	test('throws when the AST field of a regular model is missing', () => {
		const { schema, model } = setup(
			'model Post {\n id String @id\n}',
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(() => getForeignKeys(schema, model, sqliteAdapter)).toThrow(
			/Ast field authorId not found/
		)
	})
})

describe('getDefaultForeignKeyName', () => {
	// literals because test.each reads them at collection time, before the adapters are loaded
	const mysql = 64
	const postgres = 63

	test('joins the table and column names', () => {
		expect(
			getDefaultForeignKeyName({
				tableName: 'Post',
				columnNames: ['authorId'],
				maxIdentifierLength: postgres,
			})
		).toBe('Post_authorId_fkey')
		expect(
			getDefaultForeignKeyName({
				tableName: 'Office',
				columnNames: ['country', 'code'],
				maxIdentifierLength: mysql,
			})
		).toBe('Office_country_code_fkey')
	})

	test('has the provider limits', () => {
		expect(postgresAdapter.maxIdentifierLength).toBe(postgres)
		expect(mysqlAdapter.maxIdentifierLength).toBe(mysql)
		expect(sqliteAdapter.maxIdentifierLength).toBe(10000)
	})

	// joined names of limit - 6 and limit - 5 bytes: only the latter is truncated
	test.each([
		['mysql', mysql],
		['postgres', postgres],
	])('truncates at the %s limit', (_, limit) => {
		const below = 'a'.repeat(limit - 6 - 'T_'.length)
		expect(
			getDefaultForeignKeyName({
				tableName: 'T',
				columnNames: [below],
				maxIdentifierLength: limit,
			})
		).toBe(`T_${below}_fkey`)

		const atCut = 'a'.repeat(limit - 5 - 'T_'.length)
		const exactly = getDefaultForeignKeyName({
			tableName: 'T',
			columnNames: [atCut],
			maxIdentifierLength: limit,
		})
		expect(exactly).toBe(`T_${atCut}_fkey`)
		expect(exactly).toHaveLength(limit)

		const over = getDefaultForeignKeyName({
			tableName: 'T',
			columnNames: [`${atCut}bbbbbbbb`],
			maxIdentifierLength: limit,
		})
		expect(over).toBe(`T_${atCut}_fkey`)
	})

	test('backs off to a character boundary when the cut falls inside a multibyte character', () => {
		// 'T_' + 56 ascii = 58 bytes, so the 2-byte character spans bytes 58-59 and the cut at 59 is inside it
		const straddling = getDefaultForeignKeyName({
			tableName: 'T',
			columnNames: [`${'a'.repeat(56)}ézzz`],
			maxIdentifierLength: mysql,
		})
		expect(straddling).toBe(`T_${'a'.repeat(56)}_fkey`)
		expect(new TextEncoder().encode(straddling).length).toBeLessThan(mysql)
	})

	test('keeps a multibyte character that ends exactly at the cut', () => {
		const kept = getDefaultForeignKeyName({
			tableName: 'T',
			columnNames: [`${'a'.repeat(55)}ézzz`],
			maxIdentifierLength: mysql,
		})
		expect(kept).toBe(`T_${'a'.repeat(55)}é_fkey`)
		expect(new TextEncoder().encode(kept).length).toBe(mysql)
	})
})

describe('foreign key names', () => {
	test('uses the db names of the table and columns in the order of fields', () => {
		const { schema, model } = setup(
			`model Office {
				id String @id
				countryCode String @map("country_code")
				regionCode String @map("region_code")
				region Region @relation(fields: [regionCode, countryCode], references: [code, country])
				@@map("fk_offices")
			}`,
			[
				{
					...dmmfModel('Office', [
						scalar('id'),
						{ ...scalar('countryCode'), dbName: 'country_code' },
						{ ...scalar('regionCode'), dbName: 'region_code' },
						relation(
							'region',
							'Region',
							['regionCode', 'countryCode'],
							['code', 'country']
						),
					]),
					dbName: 'fk_offices',
				},
				{
					...dmmfModel('Region', [scalar('code'), scalar('country')]),
					primaryKey: { name: null, fields: ['country', 'code'] },
				},
			],
			'Office'
		)
		expect(
			getForeignKeys(schema, model, postgresAdapter).map((fk) => fk.name)
		).toEqual(['fk_offices_region_code_country_code_fkey'])
	})

	describe('a relation whose local field uses @map', () => {
		function mappedSuccessor() {
			return setup(
				`model MappedField {
					id Int @id
					successorId Int? @unique @map("successor_id")
					successor MappedField? @relation("MappedFieldSuccession", fields: [successorId], references: [id])
					predecessor MappedField? @relation("MappedFieldSuccession")
				}`,
				[
					dmmfModel('MappedField', [
						scalar('id'),
						{ ...scalar('successorId', false), dbName: 'successor_id' },
						relation('successor', 'MappedField', ['successorId'], ['id']),
					]),
				],
				'MappedField'
			)
		}

		test('names the default constraint after the mapped column', () => {
			const mapped = mappedSuccessor()
			expect(
				getForeignKeys(mapped.schema, mapped.model, postgresAdapter).map(
					(fk) => fk.name
				)
			).toEqual(['MappedField_successor_id_fkey'])
		})

		test('still references the TS keys of the columns', () => {
			const mapped = mappedSuccessor()
			const foreignKey = getForeignKeys(
				mapped.schema,
				mapped.model,
				postgresAdapter
			)[0]
			expect(foreignKey.columns).toEqual(['successorId'])
			expect(createForeignKeyEntry(foreignKey)).toContain(
				'columns: [table.successorId]'
			)
		})
	})

	test('prefers @relation(map)', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id], map: "custom")
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(
			getForeignKeys(schema, model, postgresAdapter).map((fk) => fk.name)
		).toEqual(['custom'])
	})
})

describe('foreign key targets', () => {
	function compositeTarget() {
		return {
			...dmmfModel('Region', [scalar('country'), scalar('code')]),
			primaryKey: { name: null, fields: ['country', 'code'] },
		}
	}

	test('emits a foreign key to a composite @@id target', () => {
		const { schema, model } = setup(
			`model Office {
				id String @id
				country String
				code String
				region Region @relation(fields: [country, code], references: [country, code])
			}`,
			[
				dmmfModel('Office', [
					scalar('id'),
					scalar('country'),
					scalar('code'),
					relation(
						'region',
						'Region',
						['country', 'code'],
						['country', 'code']
					),
				]),
				compositeTarget(),
			],
			'Office'
		)
		const foreignKeys = getForeignKeys(schema, model, postgresAdapter)
		expect(foreignKeys).toHaveLength(1)
		expect(createForeignKeyEntry(foreignKeys[0])).toBe(
			`foreignKey({ name: "Office_country_code_fkey", columns: [table.country, table.code], foreignColumns: [regions.country, regions.code] }).onDelete('restrict').onUpdate('cascade')`
		)
		expect(
			generateTableDeclaration(postgresAdapter, schema, model).code
		).toContain('foreignKey(')
	})

	function uniqueTarget() {
		return setup(
			`model Post {
				id String @id
				authorEmail String
				author Author @relation(fields: [authorEmail], references: [email])
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorEmail'),
					relation('author', 'Author', ['authorEmail'], ['email']),
				]),
				dmmfModel('Author', [scalar('id'), scalar('email')]),
			],
			'Post'
		)
	}

	function compositeUniqueTarget() {
		return setup(
			`model Office {
				id String @id
				country String
				code String
				region Region @relation(fields: [country, code], references: [country, code])
			}`,
			[
				dmmfModel('Office', [
					scalar('id'),
					scalar('country'),
					scalar('code'),
					relation(
						'region',
						'Region',
						['country', 'code'],
						['country', 'code']
					),
				]),
				{
					...dmmfModel('Region', [scalar('country'), scalar('code')]),
					uniqueFields: [['country', 'code']],
				},
			],
			'Office'
		)
	}

	function captureWarnings<T>(run: () => T) {
		const warnings: string[] = []
		const original = console.log
		console.log = (message: string) => {
			warnings.push(message)
		}
		try {
			return { result: run(), warnings }
		} finally {
			console.log = original
		}
	}

	test('skips a foreign key to a single-column @unique target on postgres with a warning', () => {
		const { schema, model } = uniqueTarget()
		const run = captureWarnings(() =>
			getForeignKeys(schema, model, postgresAdapter)
		)
		expect(run.result).toEqual([])
		expect(run.warnings).toHaveLength(1)
		expect(run.warnings[0]).toContain('Post_authorEmail_fkey')
		expect(run.warnings[0]).toContain('Post')
		expect(run.warnings[0]).toContain('unique indexes')
	})

	test('skips a foreign key to a @@unique target on postgres with a warning', () => {
		const { schema, model } = compositeUniqueTarget()
		const run = captureWarnings(() =>
			getForeignKeys(schema, model, postgresAdapter)
		)
		expect(run.result).toEqual([])
		expect(run.warnings).toHaveLength(1)
		expect(run.warnings[0]).toContain('Office_country_code_fkey')
	})

	test('does not emit the skipped foreign key in the table declaration', () => {
		const { schema, model } = uniqueTarget()
		const run = captureWarnings(() =>
			generateTableDeclaration(postgresAdapter, schema, model)
		)
		expect(run.result.code).not.toContain('foreignKey(')
		expect(run.result.imports).not.toContainEqual(
			expect.objectContaining({ name: 'foreignKey' })
		)
	})

	test.each(['mysql', 'sqlite'] as const)(
		'emits a foreign key to a single-column @unique target on %s',
		(provider) => {
			const { schema, model } = uniqueTarget()
			const adapter = provider === 'mysql' ? mysqlAdapter : sqliteAdapter
			const run = captureWarnings(() => getForeignKeys(schema, model, adapter))
			expect(run.warnings).toEqual([])
			expect(run.result).toHaveLength(1)
			expect(run.result[0].target.columns).toEqual(['email'])
		}
	)

	test.each(['mysql', 'sqlite'] as const)(
		'emits a foreign key to a @@unique target on %s',
		(provider) => {
			const { schema, model } = compositeUniqueTarget()
			const adapter = provider === 'mysql' ? mysqlAdapter : sqliteAdapter
			const run = captureWarnings(() => getForeignKeys(schema, model, adapter))
			expect(run.warnings).toEqual([])
			expect(run.result).toHaveLength(1)
		}
	)

	test('emits a foreign key to a single-column @id target', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id])
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		expect(getForeignKeys(schema, model, postgresAdapter)).toHaveLength(1)
	})
})

describe('generateTableDeclaration foreign keys', () => {
	test('moves every foreign key of a shared column into the config callback', () => {
		const { schema, model } = setup(
			`model Shared {
				id String @id
				sharedId String
				first First @relation(fields: [sharedId], references: [id])
				second Second @relation(fields: [sharedId], references: [id])
			}`,
			[
				dmmfModel('Shared', [
					scalar('id'),
					scalar('sharedId'),
					relation('first', 'First', ['sharedId'], ['id']),
					relation('second', 'Second', ['sharedId'], ['id']),
				]),
				target('First'),
				target('Second'),
			],
			'Shared'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).not.toContain('.references(')
		expect(output.code).toContain('foreignColumns: [firsts.id]')
		expect(output.code).toContain('foreignColumns: [seconds.id]')
	})

	test('escapes the constraint name', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id], map: "it's_fk")
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).toContain(`name: "it's_fk"`)
	})

	test('annotates the config callback return type', () => {
		const { schema, model } = setup(
			`model Post {
				id String @id
				authorId String
				author Author @relation(fields: [authorId], references: [id], map: "post_author")
			}`,
			[
				dmmfModel('Post', [
					scalar('id'),
					scalar('authorId'),
					relation('author', 'Author', ['authorId'], ['id']),
				]),
				target('Author'),
			],
			'Post'
		)
		const output = generateTableDeclaration(sqliteAdapter, schema, model)
		expect(output.code).toContain(
			'(table): SQLiteTableExtraConfigValue[] => [foreignKey('
		)
	})
})
