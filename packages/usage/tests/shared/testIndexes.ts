import { createId } from '@paralleldrive/cuid2'
import { Table, eq, getTableName, is, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import {
	MySqlTable,
	getTableConfig as getMysqlTableConfig,
} from 'drizzle-orm/mysql-core'
import {
	PgTable,
	getTableConfig as getPgTableConfig,
} from 'drizzle-orm/pg-core'
import {
	SQLiteTable,
	getTableConfig as getSqliteTableConfig,
} from 'drizzle-orm/sqlite-core'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'
import { array, object, parse, string, unknown } from 'valibot'
import { describe, expect, test } from 'vitest'

type ConfiguredIndex = { name: string; unique: boolean }

export function testIndexes(ctx: TestContext) {
	function getTables() {
		return Object.values(ctx.schema).filter((value) => is(value, Table))
	}

	function getConfiguredIndexes(table: Table): ConfiguredIndex[] {
		switch (ctx.provider) {
			case 'postgres':
				if (!is(table, PgTable)) throw new Error('Expected a PgTable')
				return getPgTableConfig(table).indexes.map((index) => {
					if (index.config.name == null) throw new Error('Index has no name')
					return { name: index.config.name, unique: index.config.unique }
				})
			case 'mysql':
				if (!is(table, MySqlTable)) throw new Error('Expected a MySqlTable')
				return getMysqlTableConfig(table).indexes.map((index) => ({
					name: index.config.name,
					unique: index.config.unique === true,
				}))
			case 'sqlite':
				if (!is(table, SQLiteTable)) throw new Error('Expected a SQLiteTable')
				return getSqliteTableConfig(table).indexes.map((index) => ({
					name: index.config.name,
					unique: index.config.unique,
				}))
		}
	}

	function getConfiguredPrimaryKeyNames(table: Table) {
		if (ctx.provider !== 'postgres') {
			throw new Error('Only Postgres names composite primary keys')
		}
		if (!is(table, PgTable)) throw new Error('Expected a PgTable')
		return getPgTableConfig(table).primaryKeys.map((key) => {
			if (key.name == null) throw new Error('Composite primary key has no name')
			return key.name
		})
	}

	async function queryRows(query: ReturnType<typeof sql>): Promise<unknown[]> {
		if (ctx.provider === 'sqlite') {
			return (ctx.db as unknown as BetterSQLite3Database).all(query)
		}
		const result: unknown = await ctx.db.execute(query)
		// mysql2 resolves to [rows, fields]
		return parse(
			array(unknown()),
			ctx.provider === 'mysql' ? parse(array(unknown()), result)[0] : result
		)
	}

	const tableNameRow = object({ table_name: string(), name: string() })

	async function getPrismaNames(
		query: ReturnType<typeof sql>
	): Promise<Map<string, string[]>> {
		const names = new Map<string, string[]>()
		for (const row of parse(array(tableNameRow), await queryRows(query))) {
			names.set(row.table_name, [
				...(names.get(row.table_name) ?? []),
				row.name,
			])
		}
		return names
	}

	function getPrismaIndexNames() {
		switch (ctx.provider) {
			case 'postgres':
				return getPrismaNames(
					sql`select t.relname as table_name, i.relname as name from pg_index x join pg_class t on t.oid = x.indrelid join pg_class i on i.oid = x.indexrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = current_schema() and not x.indisprimary`
				)
			case 'mysql':
				// MySQL itself creates an index named after each foreign key that has no covering index
				return getPrismaNames(
					sql`select distinct s.table_name as table_name, s.index_name as name from information_schema.statistics s where s.table_schema = database() and s.index_name <> 'PRIMARY' and not exists (select 1 from information_schema.table_constraints c where c.table_schema = s.table_schema and c.table_name = s.table_name and c.constraint_type = 'FOREIGN KEY' and c.constraint_name = s.index_name)`
				)
			case 'sqlite':
				return getPrismaNames(
					sql`select tbl_name as table_name, name as name from sqlite_master where type = 'index' and name not glob 'sqlite_autoindex_*'`
				)
		}
	}

	describe('indexes', () => {
		describe('unique constraints', () => {
			const ids: string[] = []

			async function insertUser(values: {
				email: string
				firstName: string
				lastName: string
			}) {
				const id = createId()
				await ctx.db.insert(ctx.schema.indexUsers).values({
					id,
					city: 'Utrecht',
					...values,
				})
				ids.push(id)
			}

			afterAll(async () => {
				for (const id of ids) {
					await ctx.db
						.delete(ctx.schema.indexUsers)
						.where(eq(ctx.schema.indexUsers.id, id))
				}
			})

			test('a non-duplicate is accepted', async () => {
				await insertUser({ email: 'a@x.test', firstName: 'A', lastName: 'One' })
				await insertUser({ email: 'b@x.test', firstName: 'B', lastName: 'One' })
			})

			test('a duplicate @unique field is rejected', async () => {
				await expect(
					insertUser({ email: 'a@x.test', firstName: 'C', lastName: 'Two' })
				).rejects.toThrow()
			})

			test('a duplicate @@unique tuple is rejected', async () => {
				await expect(
					insertUser({ email: 'd@x.test', firstName: 'A', lastName: 'One' })
				).rejects.toThrow()
			})
		})

		describe('composite key relation', () => {
			const region = { country: 'NL', code: createId() }
			const office = {
				id: createId(),
				countryCode: region.country,
				regionCode: region.code,
			}

			afterAll(async () => {
				await ctx.db
					.delete(ctx.schema.foreignKeyOffices)
					.where(eq(ctx.schema.foreignKeyOffices.id, office.id))
				await ctx.db
					.delete(ctx.schema.foreignKeyRegions)
					.where(eq(ctx.schema.foreignKeyRegions.code, region.code))
			})

			test('reads an office with its region', async () => {
				await ctx.db.insert(ctx.schema.foreignKeyRegions).values(region)
				await ctx.db.insert(ctx.schema.foreignKeyOffices).values(office)

				const result = await ctx.db.query.foreignKeyOffices
					.findFirst({
						where: (offices, { eq }) => eq(offices.id, office.id),
						with: { region: true },
					})
					.then(throwIfnull)

				expect(result).toStrictEqual({ ...office, region })
			})

			test('an office referencing a missing region is rejected', async () => {
				await expect(
					(async () => {
						await ctx.db.insert(ctx.schema.foreignKeyOffices).values({
							id: createId(),
							countryCode: 'XX',
							regionCode: createId(),
						})
					})()
				).rejects.toThrow()
			})
		})

		describe('shapes', () => {
			test('unique and non-unique indexes', () => {
				expect(
					getConfiguredIndexes(ctx.schema.indexUsers).sort((a, b) =>
						a.name.localeCompare(b.name)
					)
				).toStrictEqual([
					{ name: 'Index_User_city_lastName_idx', unique: false },
					{ name: 'Index_User_email_key', unique: true },
					{ name: 'Index_User_firstName_lastName_key', unique: true },
				])
			})

			test('names use @@map and @map database names', () => {
				expect(
					getConfiguredIndexes(ctx.schema.indexMappeds).sort((a, b) =>
						a.name.localeCompare(b.name)
					)
				).toStrictEqual([
					{ name: 'idx_mapped_first_name_last_name_key', unique: true },
					{ name: 'idx_mapped_last_name_idx', unique: false },
				])
			})

			test('explicit map names win', () => {
				const names = getConfiguredIndexes(ctx.schema.indexNameds).map(
					(index) => index.name
				)
				expect(names).toContain('idx_named_code_unique')
				expect(names).toContain('idx_named_label_custom')
			})
		})

		// Postgres and MySQL name indexes, so drizzle-kit only matches a database
		// Prisma created when the generated names are identical
		describe('names', () => {
			test('indexes match the ones of the database created by Prisma', async () => {
				const prisma = await getPrismaIndexNames()
				const drizzle = new Map<string, string[]>()
				for (const table of getTables()) {
					drizzle.set(
						getTableName(table),
						getConfiguredIndexes(table).map((index) => index.name)
					)
				}

				expect(prisma.size).toBeGreaterThan(0)
				for (const name of prisma.keys()) {
					expect(drizzle.has(name)).toBe(true)
				}
				for (const [name, indexNames] of drizzle) {
					expect([...indexNames].sort(), name).toStrictEqual(
						[...(prisma.get(name) ?? [])].sort()
					)
				}
			})

			test.skipIf(ctx.provider !== 'postgres')(
				'named primary keys match the ones of the database created by Prisma',
				async () => {
					const prisma = await getPrismaNames(
						sql`select tc.table_name as table_name, tc.constraint_name as name from information_schema.table_constraints tc join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema and kcu.table_name = tc.table_name where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = current_schema() group by tc.table_name, tc.constraint_name having count(*) > 1 or tc.constraint_name <> tc.table_name || '_pkey'`
					)
					const drizzle = new Map<string, string[]>()
					for (const table of getTables()) {
						drizzle.set(
							getTableName(table),
							getConfiguredPrimaryKeyNames(table)
						)
					}

					expect(prisma.size).toBeGreaterThan(0)
					for (const [name, keyNames] of drizzle) {
						expect([...keyNames].sort(), name).toStrictEqual(
							[...(prisma.get(name) ?? [])].sort()
						)
					}
				}
			)
		})
	})
}
