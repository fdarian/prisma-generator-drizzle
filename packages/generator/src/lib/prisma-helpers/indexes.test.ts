import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	spyOn,
	test,
} from 'bun:test'
import { getSchema } from '@mrleebo/prisma-ast'
import type { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '~/lib/logger'
import { initializeGenerator } from '~/shared/generator-context'
import {
	getDefaultConstraintName,
	getDefaultPrimaryKeyName,
} from './constraint-names'
import { resolveIndexes } from './indexes'
import { createSchema } from './schema/schema'
import { createSchemaModel } from './schema/schema-model'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

type TableDeclaration = typeof import(
	'../adapter/declarations/generateTableDeclaration'
)

let generateTableDeclaration: TableDeclaration['generateTableDeclaration']
let mysqlAdapter: typeof import('../adapter/providers/mysql').mysqlAdapter
let postgresAdapter: typeof import(
	'../adapter/providers/postgres'
).postgresAdapter
let sqliteAdapter: typeof import('../adapter/providers/sqlite').sqliteAdapter

// The adapters read the generator context while their modules load, so they must be imported after initialization
beforeAll(async () => {
	generateTableDeclaration = (
		await import('../adapter/declarations/generateTableDeclaration')
	).generateTableDeclaration
	mysqlAdapter = (await import('../adapter/providers/mysql')).mysqlAdapter
	postgresAdapter = (await import('../adapter/providers/postgres'))
		.postgresAdapter
	sqliteAdapter = (await import('../adapter/providers/sqlite')).sqliteAdapter
})

function scalar(name: string, dbName?: string): DMMF.Field {
	return {
		name,
		dbName: dbName ?? null,
		kind: 'scalar',
		type: 'String',
		isRequired: true,
		isList: false,
		isId: name === 'id',
		isUnique: false,
		isReadOnly: false,
		hasDefaultValue: false,
		isGenerated: false,
		isUpdatedAt: false,
	}
}

function dmmfModel(
	name: string,
	fields: DMMF.Field[],
	dbName: string | null = null
): DMMF.Model {
	return {
		name,
		dbName,
		schema: null,
		fields,
		uniqueFields: [],
		uniqueIndexes: [],
		primaryKey: null,
	}
}

function index(
	type: DMMF.Index['type'],
	fields: DMMF.IndexField[],
	extra: Partial<DMMF.Index> = {}
): DMMF.Index {
	return {
		model: 'Post',
		type,
		isDefinedOnField: fields.length === 1 && type === 'unique',
		fields,
		...extra,
	}
}

const field = (name: string, extra: Partial<DMMF.IndexField> = {}) => ({
	name,
	...extra,
})

function setup(
	model: DMMF.Model,
	indexes: DMMF.Index[],
	source = `model ${model.name} {\n${model.fields.map((f) => `${f.name} String${f.isId ? ' @id' : ''}`).join('\n')}\n}`
) {
	const astSchema = getSchema(source)
	const schema = createSchema({
		astSchema,
		dmmf: { datamodel: { models: [model], enums: [], types: [], indexes } },
	})
	const astModel = astSchema.list.find(
		(block) => block.type === 'model' && block.name === model.name
	)
	if (astModel?.type !== 'model') throw new Error('Model not found')
	return { schema, model: createSchemaModel({ dmmfModel: model, astModel }) }
}

const post = dmmfModel('Post', [
	scalar('id'),
	scalar('title'),
	scalar('authorId'),
	scalar('slug'),
])

let warn: ReturnType<typeof spyOn<typeof logger, 'warn'>>

beforeEach(() => {
	warn = spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
	warn.mockRestore()
})

function resolve(
	adapter: typeof postgresAdapter | typeof mysqlAdapter | typeof sqliteAdapter,
	indexes: DMMF.Index[],
	model = post
) {
	const ctx = setup(model, indexes)
	return resolveIndexes(ctx.schema, ctx.model, adapter)
}

describe('constraint names', () => {
	// literals because test.each reads them at collection time, before the adapters are loaded
	const mysql = 64
	const postgres = 63

	test('plain names', () => {
		const names = resolve(postgresAdapter, [
			index('unique', [field('slug')]),
			index('normal', [field('authorId'), field('title')]),
			index('id', [field('authorId'), field('slug')]),
		]).map((i) => i.name)
		expect(names).toEqual([
			'Post_pkey',
			'Post_slug_key',
			'Post_authorId_title_idx',
		])
	})

	test('uses @@map and @map names', () => {
		const model = dmmfModel(
			'Post',
			[scalar('id'), scalar('authorId', 'author_id'), scalar('slug', 's')],
			'posts'
		)
		const names = resolve(
			postgresAdapter,
			[
				index('unique', [field('authorId'), field('slug')]),
				index('normal', [field('authorId')]),
				index('id', [field('authorId'), field('slug')]),
			],
			model
		).map((i) => i.name)
		expect(names).toEqual([
			'posts_pkey',
			'posts_author_id_s_key',
			'posts_author_id_idx',
		])
	})

	test('map: wins over the default name', () => {
		const names = resolve(postgresAdapter, [
			index('unique', [field('slug')], { dbName: 'slug_unique' }),
			index('normal', [field('title')], { dbName: 'title_lookup' }),
			index('id', [field('id'), field('slug')], { dbName: 'post_pk' }),
		]).map((i) => i.name)
		expect(names).toEqual(['post_pk', 'slug_unique', 'title_lookup'])
	})

	test('orders primary key, unique indexes, then indexes, keeping DMMF order within a kind', () => {
		const resolved = resolve(sqliteAdapter, [
			index('normal', [field('title')]),
			index('unique', [field('slug')]),
			index('normal', [field('authorId')]),
			index('id', [field('authorId'), field('slug')]),
			index('unique', [field('title')]),
		])
		expect(resolved.map((i) => [i.kind, i.columns[0].key])).toEqual([
			['primaryKey', 'authorId'],
			['unique', 'slug'],
			['unique', 'title'],
			['index', 'title'],
			['index', 'authorId'],
		])
	})

	test('ignores a single-column @id and indexes of other models', () => {
		expect(
			resolve(postgresAdapter, [
				index('id', [field('id')]),
				index('normal', [field('title')], { model: 'Other' }),
			])
		).toEqual([])
	})

	test.each([
		['mysql', mysql],
		['postgres', postgres],
	])('truncates at the %s limit and keeps the suffix', (_, limit) => {
		for (const suffix of ['_key', '_idx'] as const) {
			const room = limit - suffix.length
			const atCut = 'a'.repeat(room - 'T_'.length)
			const exact = getDefaultConstraintName({
				tableName: 'T',
				columnNames: [atCut],
				suffix,
				maxIdentifierLength: limit,
			})
			expect(exact).toBe(`T_${atCut}${suffix}`)
			expect(exact).toHaveLength(limit)

			const over = getDefaultConstraintName({
				tableName: 'T',
				columnNames: [`${atCut}bbbb`],
				suffix,
				maxIdentifierLength: limit,
			})
			expect(over).toBe(`T_${atCut}${suffix}`)

			const below = 'a'.repeat(room - 1 - 'T_'.length)
			expect(
				getDefaultConstraintName({
					tableName: 'T',
					columnNames: [below],
					suffix,
					maxIdentifierLength: limit,
				})
			).toBe(`T_${below}${suffix}`)
		}
	})

	test.each([
		['mysql', mysql],
		['postgres', postgres],
	])('truncates the primary key table name at the %s limit', (_, limit) => {
		const fits = 'a'.repeat(limit - 5)
		expect(
			getDefaultPrimaryKeyName({ tableName: fits, maxIdentifierLength: limit })
		).toBe(`${fits}_pkey`)
		expect(
			getDefaultPrimaryKeyName({
				tableName: `${fits}bbb`,
				maxIdentifierLength: limit,
			})
		).toBe(`${fits}_pkey`)
	})

	test('backs off to a character boundary', () => {
		// 'T_' + 56 ascii = 58 bytes, the 2-byte character spans bytes 58-59 and the cut at 59 is inside it
		expect(
			getDefaultConstraintName({
				tableName: 'T',
				columnNames: [`${'a'.repeat(56)}ézzz`],
				suffix: '_idx',
				maxIdentifierLength: postgres,
			})
		).toBe(`T_${'a'.repeat(56)}_idx`)
	})

	test('truncates through resolveIndexes', () => {
		const column = 'c'.repeat(80)
		const model = dmmfModel('Post', [scalar('id'), scalar(column)])
		const [resolved] = resolve(
			postgresAdapter,
			[index('normal', [field(column)])],
			model
		)
		expect(resolved.name).toBe(`Post_${'c'.repeat(54)}_idx`)
		expect(resolved.name).toHaveLength(63)
	})
})

describe('index arguments', () => {
	test('postgres keeps desc and a non-btree method', () => {
		const [resolved] = resolve(postgresAdapter, [
			index('normal', [field('title', { sortOrder: 'desc' }), field('slug')], {
				algorithm: 'Hash',
			}),
		])
		expect(resolved.columns).toEqual([
			{ key: 'title', desc: true },
			{ key: 'slug', desc: false },
		])
		expect(resolved.method).toBe('hash')
		expect(warn).not.toHaveBeenCalled()
	})

	test('omits the method for BTree', () => {
		const [resolved] = resolve(postgresAdapter, [
			index('normal', [field('title')], { algorithm: 'BTree' }),
		])
		expect(resolved.method).toBeUndefined()
	})

	test.each([
		['mysql', () => mysqlAdapter],
		['sqlite', () => sqliteAdapter],
	])('%s skips sort order and warns', (_, getAdapter) => {
		const [resolved] = resolve(getAdapter(), [
			index('normal', [field('title', { sortOrder: 'desc' })], {
				dbName: 'title_desc',
			}),
		])
		expect(resolved.columns).toEqual([{ key: 'title', desc: false }])
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toBe(
			'Skipped descending sort on title of index "title_desc" of Post, Drizzle cannot express it'
		)
	})

	test('does not warn for ascending sort', () => {
		resolve(mysqlAdapter, [
			index('normal', [field('title', { sortOrder: 'asc' })]),
		])
		expect(warn).not.toHaveBeenCalled()
	})

	test('keeps the index and warns for length and clustered', () => {
		const resolved = resolve(postgresAdapter, [
			index('normal', [field('title', { length: 10 }), field('slug')], {
				clustered: true,
				dbName: 'lookup',
			}),
		])
		expect(resolved).toHaveLength(1)
		expect(resolved[0].columns.map((c) => c.key)).toEqual(['title', 'slug'])
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped clustered of index "lookup" of Post, Drizzle cannot express it',
			'Skipped length on title of index "lookup" of Post, Drizzle cannot express it',
		])
	})

	test.each([
		['JsonbPathOps', 'jsonb_path_ops'],
		['InetOps', 'inet_ops'],
		['ArrayOps', 'array_ops'],
		['Int4MinMaxMultiOps', 'int4_minmax_multi_ops'],
		['TimestampTzBloomOps', 'timestamptz_bloom_ops'],
		['gin_trgm_ops', 'gin_trgm_ops'],
	])('postgres maps operator class %s to %s', (operatorClass, sql) => {
		const [resolved] = resolve(postgresAdapter, [
			index('normal', [field('title', { operatorClass }), field('slug')], {
				algorithm: 'Gin',
			}),
		])
		expect(resolved.columns.map((c) => c.operatorClass)).toEqual([
			sql,
			undefined,
		])
		expect(warn).not.toHaveBeenCalled()
	})

	test.each([
		['mysql', () => mysqlAdapter],
		['sqlite', () => sqliteAdapter],
	])('%s skips an operator class and warns', (_, getAdapter) => {
		const [resolved] = resolve(getAdapter(), [
			index('normal', [field('title', { operatorClass: 'text_pattern_ops' })], {
				dbName: 'lookup',
			}),
		])
		expect(resolved.columns[0].operatorClass).toBeUndefined()
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped operator class on title of index "lookup" of Post, Drizzle cannot express it',
		])
	})

	test('skips a fulltext index and warns', () => {
		expect(
			resolve(mysqlAdapter, [index('fulltext', [field('title')])])
		).toEqual([])
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped the whole fulltext index of index "Post_title_idx" of Post, Drizzle cannot express it',
		])
	})

	test('warns when a primary key has arguments Drizzle cannot express', () => {
		const [resolved] = resolve(postgresAdapter, [
			index('id', [field('authorId', { sortOrder: 'desc' }), field('slug')]),
		])
		expect(resolved.columns.map((c) => c.desc)).toEqual([false, false])
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('primary key "Post_pkey" of Post')
	})
})

describe('fields without a column', () => {
	test('skips an index on an @ignore d field and warns', () => {
		const ctx = setup(
			dmmfModel('Post', [scalar('id')]),
			[index('normal', [field('hidden')])],
			'model Post {\n id String @id\n hidden String @ignore\n}'
		)
		expect(resolveIndexes(ctx.schema, ctx.model, postgresAdapter)).toEqual([])
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped index on Post(hidden), column hidden is not generated (@ignore or Unsupported)',
		])
	})

	test('skips an index on an Unsupported field without throwing', () => {
		const ctx = setup(
			dmmfModel('Post', [scalar('id')]),
			[index('normal', [field('geom')], { algorithm: 'Gist' })],
			'model Post {\n id String @id\n geom Unsupported("geometry")?\n}'
		)
		expect(resolveIndexes(ctx.schema, ctx.model, postgresAdapter)).toEqual([])
		expect(warn).toHaveBeenCalledTimes(1)
	})

	test('skips the whole index when only some fields are missing', () => {
		const ctx = setup(
			dmmfModel('Post', [scalar('id'), scalar('title')]),
			[
				index('normal', [field('title'), field('hidden')]),
				index('unique', [field('title')]),
			],
			'model Post {\n id String @id\n title String\n hidden String @ignore\n}'
		)
		const resolved = resolveIndexes(ctx.schema, ctx.model, postgresAdapter)
		expect(resolved.map((i) => i.name)).toEqual(['Post_title_key'])
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped index on Post(title, hidden), column hidden is not generated (@ignore or Unsupported)',
		])
	})

	test('skips a composite primary key that includes a missing field', () => {
		const ctx = setup(
			dmmfModel('Post', [scalar('id')]),
			[index('id', [field('id'), field('hidden')])],
			'model Post {\n id String\n hidden String @ignore\n @@id([id, hidden])\n}'
		)
		expect(resolveIndexes(ctx.schema, ctx.model, postgresAdapter)).toEqual([])
		expect(warn.mock.calls[0][0]).toContain('Skipped primary key on Post')
	})
})

describe('partial indexes', () => {
	const fields = ['id', 'title', 'slug']
	function resolveWith(declarations: string, indexes: DMMF.Index[]) {
		const ctx = setup(
			dmmfModel(
				'Post',
				fields.map((name) => scalar(name))
			),
			indexes,
			`model Post {\n id String @id\n title String\n slug String ${declarations}\n}`
		)
		return resolveIndexes(ctx.schema, ctx.model, postgresAdapter)
	}

	test('skips an @@unique with where and warns', () => {
		const resolved = resolveWith(
			'\n @@unique([title], where: raw("slug is not null"))\n @@index([slug])',
			[index('unique', [field('title')]), index('normal', [field('slug')])]
		)
		expect(resolved.map((i) => i.name)).toEqual(['Post_slug_idx'])
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			'Skipped index "Post_title_key" of Post, its where: predicate is not generated and a full index would be wrong',
		])
	})

	test('skips an @@index with where, matching fields in order and map:', () => {
		const resolved = resolveWith(
			'\n @@index([title, slug], where: raw("x"), map: "partial")\n @@index([slug, title], map: "full")',
			[
				index('normal', [field('title'), field('slug')], { dbName: 'partial' }),
				index('normal', [field('slug'), field('title')], { dbName: 'full' }),
			]
		)
		expect(resolved.map((i) => i.name)).toEqual(['full'])
	})

	test('skips a field-level @unique with where', () => {
		const resolved = resolveWith('@unique(where: raw("x"))', [
			index('unique', [field('slug')]),
		])
		expect(resolved).toEqual([])
		expect(warn).toHaveBeenCalledTimes(1)
	})

	test('reads fields: with sort arguments', () => {
		const resolved = resolveWith(
			'\n @@unique(fields: [title(sort: Desc), slug], where: raw("x"))',
			[index('unique', [field('title', { sortOrder: 'desc' }), field('slug')])]
		)
		expect(resolved).toEqual([])
	})

	test('keeps an index of another kind on the same fields', () => {
		const resolved = resolveWith(
			'\n @@unique([title], where: raw("x"))\n @@index([title])',
			[index('unique', [field('title')]), index('normal', [field('title')])]
		)
		expect(resolved.map((i) => i.kind)).toEqual(['index'])
	})

	test('keeps a same-kind index on the same fields with a different map:', () => {
		const resolved = resolveWith(
			'\n @@index([title], where: raw("x"), map: "partial")\n @@index([title], map: "full")',
			[
				index('normal', [field('title')], { dbName: 'partial' }),
				index('normal', [field('title')], { dbName: 'full' }),
			]
		)
		expect(resolved.map((i) => i.name)).toEqual(['full'])
	})

	test('does not skip an index without where', () => {
		const resolved = resolveWith('@unique\n @@index([title])', [
			index('unique', [field('slug')]),
			index('normal', [field('title')]),
		])
		expect(resolved).toHaveLength(2)
		expect(warn).not.toHaveBeenCalled()
	})
})

describe('generateTableDeclaration constraints', () => {
	const model = dmmfModel('Post', [
		scalar('id'),
		scalar('title'),
		scalar('authorId'),
		scalar('slug'),
	])
	const indexes = [
		index('normal', [field('title', { sortOrder: 'desc' }), field('slug')]),
		index('unique', [field('slug')]),
		index('unique', [field('authorId'), field('title')], {
			dbName: 'author_title',
		}),
		index('normal', [field('authorId')], { algorithm: 'Hash' }),
		index('id', [field('authorId'), field('slug')]),
	]

	function generate(adapter: Parameters<typeof generateTableDeclaration>[0]) {
		const ctx = setup(model, indexes)
		return generateTableDeclaration(adapter, ctx.schema, ctx.model)
	}

	function importedNames(
		output: ReturnType<typeof generateTableDeclaration>,
		module: string
	) {
		return output.imports
			.filter((i) => i.type === 'namedImport' && i.module === module)
			.flatMap((i) => (i.type === 'namedImport' ? i.names : []))
	}

	test('postgres emits desc, methods and a named composite primary key', () => {
		const output = generate(postgresAdapter)
		expect(output.code).toContain(
			`(table): PgTableExtraConfigValue[] => [primaryKey({ name: "Post_pkey", columns: [table.authorId, table.slug] }), uniqueIndex("Post_slug_key").on(table.slug), uniqueIndex("author_title").on(table.authorId, table.title), index("Post_title_slug_idx").on(table.title.desc().nullsFirst(), table.slug), index("Post_authorId_idx").using('hash', table.authorId)]`
		)
		expect(importedNames(output, postgresAdapter.coreModule)).toEqual(
			expect.arrayContaining(['primaryKey', 'uniqueIndex', 'index'])
		)
	})

	test('postgres emits operator classes', () => {
		const ctx = setup(model, [
			index('normal', [field('title', { operatorClass: 'gin_trgm_ops' })], {
				algorithm: 'Gin',
			}),
			index('normal', [field('slug', { operatorClass: 'JsonbPathOps' })], {
				dbName: 'slug_ops',
			}),
		])
		const output = generateTableDeclaration(
			postgresAdapter,
			ctx.schema,
			ctx.model
		)
		expect(output.code).toContain(
			`index("Post_title_idx").using('gin', table.title.op("gin_trgm_ops")), index("slug_ops").on(table.slug.op("jsonb_path_ops"))`
		)
	})

	test('mysql emits an unnamed composite primary key and no sort or method', () => {
		const output = generate(mysqlAdapter)
		expect(output.code).toContain(
			`(table): MySqlTableExtraConfigValue[] => [primaryKey({ columns: [table.authorId, table.slug] }), uniqueIndex("Post_slug_key").on(table.slug), uniqueIndex("author_title").on(table.authorId, table.title), index("Post_title_slug_idx").on(table.title, table.slug), index("Post_authorId_idx").on(table.authorId)]`
		)
		expect(importedNames(output, mysqlAdapter.coreModule)).toEqual(
			expect.arrayContaining(['primaryKey', 'uniqueIndex', 'index'])
		)
	})

	test('sqlite emits an unnamed composite primary key', () => {
		const output = generate(sqliteAdapter)
		expect(output.code).toContain(
			`(table): SQLiteTableExtraConfigValue[] => [primaryKey({ columns: [table.authorId, table.slug] }), uniqueIndex("Post_slug_key")`
		)
		expect(output.code).not.toContain('.desc()')
		expect(output.code).not.toContain('.using(')
	})

	test('imports only the builders in use', () => {
		const ctx = setup(model, [index('unique', [field('slug')])])
		const output = generateTableDeclaration(
			postgresAdapter,
			ctx.schema,
			ctx.model
		)
		expect(importedNames(output, postgresAdapter.coreModule)).toContain(
			'uniqueIndex'
		)
		expect(importedNames(output, postgresAdapter.coreModule)).not.toContain(
			'index'
		)
		expect(importedNames(output, postgresAdapter.coreModule)).not.toContain(
			'primaryKey'
		)
	})

	test('emits no extra config for a model without indexes', () => {
		const ctx = setup(model, [])
		const output = generateTableDeclaration(
			postgresAdapter,
			ctx.schema,
			ctx.model
		)
		expect(output.code).not.toContain('ExtraConfigValue')
	})
})

describe('implicit join table', () => {
	function joinTable(dbName: string) {
		const dmmf = {
			...dmmfModel('PostToTag', [scalar('A'), scalar('B')], dbName),
			primaryKey: { name: null, fields: ['A', 'B'] },
		}
		const schema = createSchema({
			astSchema: getSchema(''),
			dmmf: {
				datamodel: { models: [dmmf], enums: [], types: [], indexes: [] },
			},
		})
		return {
			schema,
			model: createSchemaModel({ dmmfModel: dmmf, isImplicitJoinTable: true }),
		}
	}

	test.each([
		[
			'postgres',
			() => postgresAdapter,
			'PgTableExtraConfigValue[] => [primaryKey({ name: "_PostToTag_AB_pkey", columns: [table.A, table.B] }), index("_PostToTag_B_index").on(table.B)]',
		],
		[
			'mysql',
			() => mysqlAdapter,
			'MySqlTableExtraConfigValue[] => [uniqueIndex("_PostToTag_AB_unique").on(table.A, table.B), index("_PostToTag_B_index").on(table.B)]',
		],
		[
			'sqlite',
			() => sqliteAdapter,
			'SQLiteTableExtraConfigValue[] => [uniqueIndex("_PostToTag_AB_unique").on(table.A, table.B), index("_PostToTag_B_index").on(table.B)]',
		],
	])('%s emits what Prisma creates', (_, getAdapter, expected) => {
		const ctx = joinTable('_PostToTag')
		const output = generateTableDeclaration(getAdapter(), ctx.schema, ctx.model)
		expect(output.code).toContain(expected)
	})

	test('does not read the primaryKey of the synthetic model', () => {
		const ctx = joinTable('_PostToTag')
		expect(
			resolveIndexes(ctx.schema, ctx.model, mysqlAdapter).map((i) => i.kind)
		).toEqual(['unique', 'index'])
	})

	test('truncates the join table name by characters, not bytes', () => {
		const ctx = joinTable(`_${'é'.repeat(80)}`)
		const names = resolveIndexes(ctx.schema, ctx.model, postgresAdapter).map(
			(i) => i.name
		)
		expect(names).toEqual([
			`_${'é'.repeat(63 - '_AB_pkey'.length - 1)}_AB_pkey`,
			`_${'é'.repeat(63 - '_B_index'.length - 1)}_B_index`,
		])
	})

	test.each([
		['postgres', () => postgresAdapter, 63],
		['mysql', () => mysqlAdapter, 64],
	])(
		'truncates the table name at the %s limit and keeps the suffix',
		(_, getAdapter, limit) => {
			const ctx = joinTable(`_${'r'.repeat(80)}`)
			const names = resolveIndexes(ctx.schema, ctx.model, getAdapter()).map(
				(i) => i.name
			)
			const keySuffix =
				getAdapter().indexFeatures.implicitJoinTableKey === 'primaryKey'
					? '_AB_pkey'
					: '_AB_unique'
			expect(names).toEqual([
				`_${'r'.repeat(limit - keySuffix.length - 1)}${keySuffix}`,
				`_${'r'.repeat(limit - '_B_index'.length - 1)}_B_index`,
			])
			for (const name of names) {
				if (name == null) throw new Error('Expected a named constraint')
				expect(new TextEncoder().encode(name).length).toBe(limit)
			}
		}
	)
})
