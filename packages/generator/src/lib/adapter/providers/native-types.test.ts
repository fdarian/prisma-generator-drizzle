import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { mysqlAdapter } from './mysql'
import { postgresAdapter } from './postgres'

const generatorConfig: { dateMode?: 'date' | 'string' } = {}

vi.mock('~/shared/generator-context', () => ({
	getGenerator: () => ({ config: generatorConfig }),
	getModuleResolution: () => undefined,
}))

beforeEach(() => {
	generatorConfig.dateMode = undefined
})

type FieldInput = {
	type: string
	nativeType?: [string, string[]]
	isList?: boolean
	isId?: boolean
	default?: unknown
	documentation?: string
}

function makeField(input: FieldInput) {
	return {
		name: 'col',
		kind: 'scalar',
		type: input.type,
		nativeType: input.nativeType ?? null,
		isList: input.isList ?? false,
		isId: input.isId ?? false,
		isRequired: false,
		documentation: input.documentation,
		hasDefaultValue: input.default !== undefined,
		default: input.default,
	} as unknown as SchemaField
}

function pg(input: FieldInput) {
	const result = postgresAdapter.parseField(makeField(input))
	return {
		func: result.func,
		imports: result.imports.map((i) => i.render()),
	}
}

function mysql(input: FieldInput) {
	const result = mysqlAdapter.parseField(makeField(input))
	return {
		func: result.func,
		imports: result.imports.map((i) => i.render()),
	}
}

const pgImport = (name: string) =>
	`import { ${name} } from 'drizzle-orm/pg-core';`
const mysqlImport = (name: string) =>
	`import { ${name} } from 'drizzle-orm/mysql-core';`

describe('postgres native types', () => {
	it.each<[string, string, string[], string, string]>([
		[
			'String',
			'VarChar',
			['255'],
			"varchar('col', { length: 255 })",
			'varchar',
		],
		['String', 'VarChar', [], "varchar('col')", 'varchar'],
		['String', 'Char', ['3'], "char('col', { length: 3 })", 'char'],
		['String', 'Char', [], "char('col')", 'char'],
		['String', 'Uuid', [], "uuid('col')", 'uuid'],
		['String', 'Inet', [], "inet('col')", 'inet'],
		['String', 'Text', [], "text('col')", 'text'],
		['String', 'Bit', ['1'], "text('col')", 'text'],
		['String', 'VarBit', ['1'], "text('col')", 'text'],
		['String', 'Xml', [], "text('col')", 'text'],
		['String', 'Citext', [], "text('col')", 'text'],
		['Int', 'Integer', [], "integer('col')", 'integer'],
		['Int', 'SmallInt', [], "smallint('col')", 'smallint'],
		['Int', 'Oid', [], "integer('col')", 'integer'],
		[
			'Float',
			'DoublePrecision',
			[],
			"doublePrecision('col')",
			'doublePrecision',
		],
		['Float', 'Real', [], "real('col')", 'real'],
		[
			'Decimal',
			'Decimal',
			['10', '2'],
			"decimal('col', { precision: 10, scale: 2 })",
			'decimal',
		],
		['Decimal', 'Decimal', [], "decimal('col')", 'decimal'],
		[
			'Decimal',
			'Money',
			[],
			"decimal('col', { precision: 65, scale: 30 })",
			'decimal',
		],
		[
			'DateTime',
			'Timestamp',
			['6'],
			"timestamp('col', { mode: 'date', precision: 6 })",
			'timestamp',
		],
		[
			'DateTime',
			'Timestamp',
			[],
			"timestamp('col', { mode: 'date' })",
			'timestamp',
		],
		[
			'DateTime',
			'Timestamptz',
			['6'],
			"timestamp('col', { mode: 'date', precision: 6, withTimezone: true })",
			'timestamp',
		],
		[
			'DateTime',
			'Timestamptz',
			[],
			"timestamp('col', { mode: 'date', withTimezone: true })",
			'timestamp',
		],
		['DateTime', 'Date', [], "date('col', { mode: 'date' })", 'date'],
		['DateTime', 'Time', ['3'], "time('col', { precision: 3 })", 'time'],
		['DateTime', 'Time', [], "time('col')", 'time'],
		[
			'DateTime',
			'Timetz',
			['3'],
			"time('col', { precision: 3, withTimezone: true })",
			'time',
		],
		['DateTime', 'Timetz', [], "time('col', { withTimezone: true })", 'time'],
		['Json', 'JsonB', [], "jsonb('col')", 'jsonb'],
		['Json', 'Json', [], "json('col')", 'json'],
		['Bytes', 'ByteA', [], "customBytes('col')", 'customBytes'],
		['BigInt', 'BigInt', [], "bigint('col', { mode: 'bigint' })", 'bigint'],
	])('%s @db.%s(%j)', (type, native, args, func, importName) => {
		const result = pg({ type, nativeType: [native, args] })

		expect(result.func).toBe(func)
		expect(result.imports).toHaveLength(1)
		expect(result.imports[0]).toContain(`{ ${importName} }`)
	})

	it('keeps the import module for native builders', () => {
		expect(
			pg({ type: 'String', nativeType: ['VarChar', ['255']] }).imports
		).toEqual([pgImport('varchar')])
	})

	it.each<[string, string]>([
		['String', "text('col')"],
		['Int', "integer('col')"],
		['Float', "doublePrecision('col')"],
		['Decimal', "decimal('col', { precision: 65, scale: 30 })"],
		['DateTime', "timestamp('col', { mode: 'date', precision: 3 })"],
		['Json', "jsonb('col')"],
		['Boolean', "boolean('col')"],
		['BigInt', "bigint('col', { mode: 'bigint' })"],
	])('leaves %s without @db.* unchanged', (type, func) => {
		expect(pg({ type }).func).toBe(func)
	})

	it('appends .array() to a native list column', () => {
		expect(
			pg({ type: 'String', isList: true, nativeType: ['VarChar', ['255']] })
				.func
		).toBe("varchar('col', { length: 255 }).array()")
	})

	it('honors the dateMode config on Timestamptz', () => {
		generatorConfig.dateMode = 'string'

		expect(
			pg({ type: 'DateTime', nativeType: ['Timestamptz', ['6']] }).func
		).toBe(
			"timestamp('col', { mode: 'string', precision: 6, withTimezone: true })"
		)
	})

	it('honors the drizzle.dateMode directive on Date', () => {
		expect(
			pg({
				type: 'DateTime',
				nativeType: ['Date', []],
				documentation: 'drizzle.dateMode string',
			}).func
		).toBe("date('col', { mode: 'string' })")
	})

	// https://github.com/fdarian/prisma-generator-drizzle/issues/78
	it('maps @db.Date to date, with defaultNow', () => {
		const result = pg({
			type: 'DateTime',
			nativeType: ['Date', []],
			default: { name: 'now', args: [] },
		})

		expect(result.func).toBe(
			"date('col', { mode: 'date' }).defaultNow().notNull()"
		)
		expect(result.imports).toEqual([pgImport('date')])
	})

	// https://github.com/fdarian/prisma-generator-drizzle/issues/74
	it('maps @db.Time to time, with defaultNow', () => {
		const result = pg({
			type: 'DateTime',
			nativeType: ['Time', []],
			default: { name: 'now', args: [] },
		})

		expect(result.func).toBe("time('col').defaultNow().notNull()")
		expect(result.imports).toEqual([pgImport('time')])
	})

	it('maps SmallInt with autoincrement to smallserial', () => {
		const result = pg({
			type: 'Int',
			nativeType: ['SmallInt', []],
			isId: true,
			default: { name: 'autoincrement', args: [] },
		})

		expect(result.func).toBe("smallserial('col').primaryKey()")
		expect(result.imports).toEqual([pgImport('smallserial')])
	})

	it('keeps serial for Integer with autoincrement', () => {
		expect(
			pg({
				type: 'Int',
				nativeType: ['Integer', []],
				isId: true,
				default: { name: 'autoincrement', args: [] },
			}).func
		).toBe("serial('col').primaryKey()")
	})

	it('applies a drizzle.custom $type on top of a native column', () => {
		const result = pg({
			type: 'String',
			nativeType: ['VarChar', ['255']],
			documentation:
				'drizzle.custom {"$type": "Email", "imports": [{ "name": ["Email"], "module": "./types", "type": true }]}',
		})

		expect(result.func).toBe("varchar('col', { length: 255 }).$type<Email>()")
		expect(result.imports).toEqual([
			pgImport('varchar'),
			"import type { Email } from './types';",
		])
	})

	it('throws on a non-numeric native type argument', () => {
		expect(() =>
			pg({ type: 'String', nativeType: ['VarChar', ['Max']] })
		).toThrow('Unsupported @db.VarChar argument "Max" on field "col"')
	})
})

describe('mysql native types', () => {
	it.each<[string, string, string[], string, string]>([
		[
			'String',
			'VarChar',
			['255'],
			"varchar('col', { length: 255 })",
			'varchar',
		],
		['String', 'Char', ['3'], "char('col', { length: 3 })", 'char'],
		['String', 'Text', [], "text('col')", 'text'],
		['String', 'TinyText', [], "tinytext('col')", 'tinytext'],
		['String', 'MediumText', [], "mediumtext('col')", 'mediumtext'],
		['String', 'LongText', [], "longtext('col')", 'longtext'],
		['Boolean', 'TinyInt', [], "boolean('col')", 'boolean'],
		['Boolean', 'Bit', ['1'], "boolean('col')", 'boolean'],
		['Int', 'Int', [], "int('col')", 'int'],
		['Int', 'UnsignedInt', [], "int('col', { unsigned: true })", 'int'],
		['Int', 'SmallInt', [], "smallint('col')", 'smallint'],
		[
			'Int',
			'UnsignedSmallInt',
			[],
			"smallint('col', { unsigned: true })",
			'smallint',
		],
		['Int', 'MediumInt', [], "mediumint('col')", 'mediumint'],
		[
			'Int',
			'UnsignedMediumInt',
			[],
			"mediumint('col', { unsigned: true })",
			'mediumint',
		],
		['Int', 'TinyInt', [], "tinyint('col')", 'tinyint'],
		[
			'Int',
			'UnsignedTinyInt',
			[],
			"tinyint('col', { unsigned: true })",
			'tinyint',
		],
		['Int', 'Year', [], "year('col')", 'year'],
		['BigInt', 'BigInt', [], "bigint('col', { mode: 'bigint' })", 'bigint'],
		[
			'BigInt',
			'UnsignedBigInt',
			[],
			"bigint('col', { mode: 'bigint', unsigned: true })",
			'bigint',
		],
		['Float', 'Float', [], "float('col')", 'float'],
		['Float', 'Double', [], "double('col')", 'double'],
		[
			'Decimal',
			'Decimal',
			['10', '2'],
			"decimal('col', { precision: 10, scale: 2 })",
			'decimal',
		],
		['Decimal', 'Decimal', [], "decimal('col')", 'decimal'],
		[
			'DateTime',
			'DateTime',
			['6'],
			"datetime('col', { mode: 'date', fsp: 6 })",
			'datetime',
		],
		[
			'DateTime',
			'DateTime',
			[],
			"datetime('col', { mode: 'date' })",
			'datetime',
		],
		[
			'DateTime',
			'Timestamp',
			['0'],
			"timestamp('col', { mode: 'date', fsp: 0 })",
			'timestamp',
		],
		['DateTime', 'Date', [], "date('col', { mode: 'date' })", 'date'],
		['DateTime', 'Time', ['3'], "time('col', { fsp: 3 })", 'time'],
		['DateTime', 'Time', [], "time('col')", 'time'],
		['Json', 'Json', [], "json('col')", 'json'],
		['Bytes', 'LongBlob', [], "customBytes('col')", 'customBytes'],
		['Bytes', 'Binary', ['16'], "customBytes('col')", 'customBytes'],
		['Bytes', 'VarBinary', ['16'], "customBytes('col')", 'customBytes'],
		['Bytes', 'TinyBlob', [], "customBytes('col')", 'customBytes'],
		['Bytes', 'Blob', [], "customBytes('col')", 'customBytes'],
		['Bytes', 'MediumBlob', [], "customBytes('col')", 'customBytes'],
		['Bytes', 'Bit', ['1'], "customBytes('col')", 'customBytes'],
	])('%s @db.%s(%j)', (type, native, args, func, importName) => {
		const result = mysql({ type, nativeType: [native, args] })

		expect(result.func).toBe(func)
		expect(result.imports).toHaveLength(1)
		expect(result.imports[0]).toContain(`{ ${importName} }`)
	})

	it.each<[string, string]>([
		['String', "text('col')"],
		['Int', "int('col')"],
		['Float', "float('col')"],
		['Decimal', "decimal('col', { precision: 65, scale: 30 })"],
		['DateTime', "datetime('col', { mode: 'date', fsp: 3 })"],
		['Json', "json('col')"],
		['Boolean', "boolean('col')"],
		['BigInt', "bigint('col', { mode: 'bigint' })"],
	])('leaves %s without @db.* unchanged', (type, func) => {
		expect(mysql({ type }).func).toBe(func)
	})

	it('maps DateTime(6) with now() to CURRENT_TIMESTAMP(6)', () => {
		const result = mysql({
			type: 'DateTime',
			nativeType: ['DateTime', ['6']],
			default: { name: 'now', args: [] },
		})

		expect(result.func).toBe(
			"datetime('col', { mode: 'date', fsp: 6 }).default(sql`CURRENT_TIMESTAMP(6)`).notNull()"
		)
		expect(result.imports).toEqual([
			mysqlImport('datetime'),
			"import { sql } from 'drizzle-orm';",
		])
	})

	it('maps DateTime without precision and now() to CURRENT_TIMESTAMP', () => {
		expect(
			mysql({
				type: 'DateTime',
				nativeType: ['DateTime', []],
				default: { name: 'now', args: [] },
			}).func
		).toBe(
			"datetime('col', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull()"
		)
	})

	it('maps @db.Date with now() to (CURRENT_DATE)', () => {
		expect(
			mysql({
				type: 'DateTime',
				nativeType: ['Date', []],
				default: { name: 'now', args: [] },
			}).func
		).toBe(
			"date('col', { mode: 'date' }).default(sql`(CURRENT_DATE)`).notNull()"
		)
	})

	it('maps @db.Time(2) with now() to (CURRENT_TIME(2))', () => {
		expect(
			mysql({
				type: 'DateTime',
				nativeType: ['Time', ['2']],
				default: { name: 'now', args: [] },
			}).func
		).toBe("time('col', { fsp: 2 }).default(sql`(CURRENT_TIME(2))`).notNull()")
	})

	it('maps @db.Time without precision and now() to (CURRENT_TIME)', () => {
		expect(
			mysql({
				type: 'DateTime',
				nativeType: ['Time', []],
				default: { name: 'now', args: [] },
			}).func
		).toBe("time('col').default(sql`(CURRENT_TIME)`).notNull()")
	})

	it('keeps CURRENT_TIMESTAMP(3) for DateTime without @db.*', () => {
		expect(
			mysql({
				type: 'DateTime',
				default: { name: 'now', args: [] },
			}).func
		).toBe(
			"datetime('col', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull()"
		)
	})

	it('keeps autoincrement on native integer ids', () => {
		expect(
			mysql({
				type: 'Int',
				nativeType: ['UnsignedInt', []],
				isId: true,
				default: { name: 'autoincrement', args: [] },
			}).func
		).toBe("int('col', { unsigned: true }).autoincrement().primaryKey()")
	})

	it('keeps the drizzle.custom field.mode on UnsignedBigInt', () => {
		expect(
			mysql({
				type: 'BigInt',
				nativeType: ['UnsignedBigInt', []],
				documentation: 'drizzle.custom {"field": {"mode": "number"}}',
			}).func
		).toBe("bigint('col', { mode: 'number', unsigned: true })")
	})

	it('applies a drizzle.custom $type on top of a native column', () => {
		expect(
			mysql({
				type: 'String',
				nativeType: ['VarChar', ['255']],
				documentation: 'drizzle.custom {"$type": "Email"}',
			}).func
		).toBe("varchar('col', { length: 255 }).$type<Email>()")
	})
})
