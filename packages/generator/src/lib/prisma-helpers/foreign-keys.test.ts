import { getSchema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { describe, expect, it, vi } from 'vitest'
import {
	createForeignKeyEntry,
	generateTableDeclaration,
} from '../adapter/declarations/generateTableDeclaration'
import { mysqlAdapter } from '../adapter/providers/mysql'
import { postgresAdapter } from '../adapter/providers/postgres'
import { sqliteAdapter } from '../adapter/providers/sqlite'
import {
	getDefaultForeignKeyName,
	getForeignKeys,
	resolveForeignKeys,
} from './foreign-keys'
import { createSchema } from './schema/schema'
import { createSchemaModel } from './schema/schema-model'

vi.mock('~/shared/generator-context', () => ({
	getModuleResolution: () => undefined,
}))

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
	it('throws when the target model is unknown and not ignored', () => {
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
		expect(() =>
			getForeignKeys(schema, model, sqliteAdapter.maxIdentifierLength)
		).toThrow(/unknown model Author/)
	})

	it('skips a relation whose local column is @ignore d', () => {
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
		expect(
			getForeignKeys(schema, model, sqliteAdapter.maxIdentifierLength)
		).toEqual([])
	})

	it('throws when a local column is missing and not @ignore d', () => {
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
		expect(() =>
			getForeignKeys(schema, model, sqliteAdapter.maxIdentifierLength)
		).toThrow(/references unknown fields authorId/)
	})

	it('throws when the AST field of a regular model is missing', () => {
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
		expect(() =>
			getForeignKeys(schema, model, sqliteAdapter.maxIdentifierLength)
		).toThrow(/Ast field authorId not found/)
	})
})

describe('getDefaultForeignKeyName', () => {
	const mysql = mysqlAdapter.maxIdentifierLength
	const postgres = postgresAdapter.maxIdentifierLength

	it('joins the table and column names', () => {
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

	it('has the provider limits', () => {
		expect(postgres).toBe(63)
		expect(mysql).toBe(64)
		expect(sqliteAdapter.maxIdentifierLength).toBe(10000)
	})

	// joined names of limit - 6 and limit - 5 bytes: only the latter is truncated
	it.each([
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

	it('backs off to a character boundary when the cut falls inside a multibyte character', () => {
		// 'T_' + 56 ascii = 58 bytes, so the 2-byte character spans bytes 58-59 and the cut at 59 is inside it
		const straddling = getDefaultForeignKeyName({
			tableName: 'T',
			columnNames: [`${'a'.repeat(56)}ézzz`],
			maxIdentifierLength: mysql,
		})
		expect(straddling).toBe(`T_${'a'.repeat(56)}_fkey`)
		expect(new TextEncoder().encode(straddling).length).toBeLessThan(mysql)
	})

	it('keeps a multibyte character that ends exactly at the cut', () => {
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
	it('uses the db names of the table and columns in the order of fields', () => {
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
				dmmfModel('Region', [scalar('code'), scalar('country')]),
			],
			'Office'
		)
		expect(
			resolveForeignKeys(
				schema,
				model,
				postgresAdapter.maxIdentifierLength
			).map((fk) => fk.name)
		).toEqual(['fk_offices_region_code_country_code_fkey'])
	})

	it('prefers @relation(map)', () => {
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
			getForeignKeys(schema, model, postgresAdapter.maxIdentifierLength).map(
				(fk) => fk.name
			)
		).toEqual(['custom'])
	})
})

describe('foreign key target gate', () => {
	function compositeTarget() {
		return {
			...dmmfModel('Region', [scalar('country'), scalar('code')]),
			primaryKey: { name: null, fields: ['country', 'code'] },
		}
	}

	const officeSource = `model Office {
		id String @id
		country String
		code String
		region Region @relation(fields: [country, code], references: [country, code])
	}`
	const officeModel = dmmfModel('Office', [
		scalar('id'),
		scalar('country'),
		scalar('code'),
		relation('region', 'Region', ['country', 'code'], ['country', 'code']),
	])

	it('skips a composite @@id target but still resolves and emits it', () => {
		const { schema, model } = setup(
			officeSource,
			[officeModel, compositeTarget()],
			'Office'
		)
		const limit = postgresAdapter.maxIdentifierLength
		expect(getForeignKeys(schema, model, limit)).toEqual([])

		const resolved = resolveForeignKeys(schema, model, limit)
		expect(resolved).toHaveLength(1)
		expect(createForeignKeyEntry(resolved[0])).toBe(
			`foreignKey({ name: "Office_country_code_fkey", columns: [table.country, table.code], foreignColumns: [regions.country, regions.code] }).onDelete('restrict').onUpdate('cascade')`
		)
		expect(
			generateTableDeclaration(postgresAdapter, schema, model).code
		).not.toContain('foreignKey(')
	})

	it('skips a single-column target that is not the @id', () => {
		const { schema, model } = setup(
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
				{
					...dmmfModel('Author', [scalar('id'), scalar('email')]),
				},
			],
			'Post'
		)
		const limit = postgresAdapter.maxIdentifierLength
		expect(resolveForeignKeys(schema, model, limit)).toHaveLength(1)
		expect(getForeignKeys(schema, model, limit)).toEqual([])
	})

	it('keeps a single-column @id target', () => {
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
		expect(
			getForeignKeys(schema, model, postgresAdapter.maxIdentifierLength)
		).toHaveLength(1)
	})
})

describe('generateTableDeclaration foreign keys', () => {
	it('moves every foreign key of a shared column into the config callback', () => {
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

	it('escapes the constraint name', () => {
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

	it('annotates the config callback return type', () => {
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
