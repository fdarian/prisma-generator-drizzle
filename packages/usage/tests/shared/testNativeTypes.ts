import { createId } from '@paralleldrive/cuid2'
import { eq, getTableColumns, sql } from 'drizzle-orm'
import type { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

type Row = Record<string, unknown>
type ColumnTypes = Record<string, { drizzle: string; db: string }>

const sharedData = {
	date: new Date('2024-01-23T00:00:00Z'),
	time: '12:01:30',
	timePrecise: '12:01:30.123',
	timestamp: new Date('2020-01-23T12:01:30.123Z'),
	varchar: 'John',
	smallInt: 123,
	decimal: '12345678.90',
	json: { key: 'value' },
}

const postgresData = {
	timestamptz: new Date('2020-01-23T12:01:30.123Z'),
	char: 'abcdefgh',
	uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
	inet: '192.168.0.1',
	real: 1.5,
	varcharList: ['John', 'Doe'],
}

const mysqlData = {
	datetime6: new Date('2020-01-23T12:01:30.123Z'),
	unsignedInt: 4294967295,
	tinyInt: 127,
	year: 2024,
	mediumText: 'John',
	double: 1.123,
}

const postgresColumnTypes: ColumnTypes = {
	date: { drizzle: 'date', db: 'date' },
	time: { drizzle: 'time', db: 'time without time zone' },
	timePrecise: {
		drizzle: 'time(3)',
		db: 'time(3) without time zone',
	},
	timestamp: {
		drizzle: 'timestamp (6)',
		db: 'timestamp(6) without time zone',
	},
	dateNow: { drizzle: 'date', db: 'date' },
	timeNow: { drizzle: 'time(2)', db: 'time(2) without time zone' },
	varchar: { drizzle: 'varchar(255)', db: 'character varying(255)' },
	smallInt: { drizzle: 'smallint', db: 'smallint' },
	decimal: { drizzle: 'numeric(10, 2)', db: 'numeric(10,2)' },
	json: { drizzle: 'json', db: 'json' },
	timestamptz: {
		drizzle: 'timestamp (6) with time zone',
		db: 'timestamp(6) with time zone',
	},
	char: { drizzle: 'char(8)', db: 'character(8)' },
	uuid: { drizzle: 'uuid', db: 'uuid' },
	inet: { drizzle: 'inet', db: 'inet' },
	real: { drizzle: 'real', db: 'real' },
	varcharList: {
		drizzle: 'varchar(255)[]',
		db: 'character varying(255)[]',
	},
}

const mysqlColumnTypes: ColumnTypes = {
	date: { drizzle: 'date', db: 'date' },
	time: { drizzle: 'time', db: 'time' },
	timePrecise: { drizzle: 'time(3)', db: 'time(3)' },
	timestamp: { drizzle: 'timestamp(6)', db: 'timestamp(6)' },
	varchar: { drizzle: 'varchar(255)', db: 'varchar(255)' },
	smallInt: { drizzle: 'smallint', db: 'smallint' },
	decimal: { drizzle: 'decimal(10,2)', db: 'decimal(10,2)' },
	json: { drizzle: 'json', db: 'json' },
	datetime6: { drizzle: 'datetime(6)', db: 'datetime(6)' },
	unsignedInt: { drizzle: 'int unsigned', db: 'int unsigned' },
	tinyInt: { drizzle: 'tinyint', db: 'tinyint' },
	year: { drizzle: 'year', db: 'year' },
	mediumText: { drizzle: 'mediumtext', db: 'mediumtext' },
	double: { drizzle: 'double', db: 'double' },
}

export function testNativeTypes({ db, schema, provider }: TestContext) {
	if (provider === 'sqlite') {
		throw new Error('SQLite has no @db.* native types')
	}

	const table = schema.nativeTypes

	async function queryDbColumnTypes() {
		type Result = { name: string; type: string }

		if (provider === 'postgres') {
			const rows = await db.execute<Result>(sql`
				select a.attname as name, format_type(a.atttypid, a.atttypmod) as type
				from pg_attribute a
				where a.attrelid = '"NativeType"'::regclass and a.attnum > 0 and not a.attisdropped
			`)
			return new Map(rows.map((row) => [row.name, row.type]))
		}

		const result = (await db.execute(sql`
			select column_name as name, column_type as type
			from information_schema.columns
			where table_schema = database() and table_name = 'NativeType'
		`)) as unknown as [Result[]]
		return new Map(result[0].map((row) => [row.name, row.type]))
	}

	describe('Native types', () => {
		test('generated column types match the database', async () => {
			const expected =
				provider === 'postgres' ? postgresColumnTypes : mysqlColumnTypes
			const columns = getTableColumns(table)
			const dbTypes = await queryDbColumnTypes()

			const drizzleTypes: Record<string, string> = {}
			const actualDbTypes: Record<string, string> = {}
			for (const name of Object.keys(expected)) {
				const column = (columns as Record<string, { getSQLType(): string }>)[
					name
				]
				drizzleTypes[name] = column.getSQLType()
				actualDbTypes[name] = dbTypes.get(name) ?? 'missing in database'
			}

			expect(drizzleTypes).toStrictEqual(
				Object.fromEntries(
					Object.entries(expected).map(([name, type]) => [name, type.drizzle])
				)
			)
			expect(actualDbTypes).toStrictEqual(
				Object.fromEntries(
					Object.entries(expected).map(([name, type]) => [name, type.db])
				)
			)
		})

		test('insert and select round-trip', async () => {
			const data: Row = {
				id: createId(),
				...sharedData,
				...(provider === 'postgres' ? postgresData : mysqlData),
			}
			await db.insert(table).values(data as typeof table.$inferInsert)

			const result = await db
				.select()
				.from(table)
				.where(eq(table.id, data.id as string))

			expect(result).toHaveLength(1)
			// Date columns surface as a Date and time columns as a string
			const row = result[0] as Row
			expect(row.date).toBeInstanceOf(Date)
			expect(row.timestamp).toBeInstanceOf(Date)
			expect(typeof row.time).toBe('string')
			expect(typeof row.timePrecise).toBe('string')

			expect(row).toStrictEqual({
				...data,
				// Defaults from @default(now()), which MySQL can't create on DATE/TIME columns
				...(provider === 'postgres' && {
					dateNow: expect.any(Date),
					timeNow: expect.any(String),
				}),
			})

			await db.delete(table).where(eq(table.id, data.id as string))
		})
	})
}
