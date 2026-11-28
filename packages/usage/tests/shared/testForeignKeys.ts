import { Table, getTableName, is, sql } from 'drizzle-orm'
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
import type { TestContext } from 'tests/utils/types'
import { array, object, parse, string, unknown } from 'valibot'
import { describe, expect, test } from 'vitest'

type ForeignKeyAction =
	| 'cascade'
	| 'restrict'
	| 'no action'
	| 'set null'
	| 'set default'

type ForeignKeyLike = {
	onDelete: ForeignKeyAction | undefined
	onUpdate: ForeignKeyAction | undefined
	getName(): string
	reference(): {
		columns: { name: string }[]
		foreignTable: Table
		foreignColumns: { name: string }[]
	}
}

type ForeignKeyShape = {
	name: string
	columns: string[]
	foreignTable: string
	foreignColumns: string[]
	onDelete: ForeignKeyAction | undefined
	onUpdate: ForeignKeyAction | undefined
}

export function testForeignKeys(ctx: TestContext) {
	function getTable(key: string): Table {
		const entry = Object.entries(ctx.schema).find(([name]) => name === key)
		if (entry == null || !is(entry[1], Table)) {
			throw new Error(`${key} is not a table`)
		}
		return entry[1]
	}

	function getConfiguredForeignKeys(table: Table): ForeignKeyLike[] {
		switch (ctx.provider) {
			case 'postgres':
				if (!is(table, PgTable)) throw new Error('Expected a PgTable')
				return getPgTableConfig(table).foreignKeys
			case 'mysql':
				if (!is(table, MySqlTable)) throw new Error('Expected a MySqlTable')
				return getMysqlTableConfig(table).foreignKeys
			case 'sqlite':
				if (!is(table, SQLiteTable)) throw new Error('Expected a SQLiteTable')
				return getSqliteTableConfig(table).foreignKeys
		}
	}

	function toShape(fk: ForeignKeyLike): ForeignKeyShape {
		const reference = fk.reference()
		return {
			name: fk.getName(),
			columns: reference.columns.map((column) => column.name),
			foreignTable: getTableName(reference.foreignTable),
			foreignColumns: reference.foreignColumns.map((column) => column.name),
			onDelete: fk.onDelete,
			onUpdate: fk.onUpdate,
		}
	}

	function getShapes(tableKey: string) {
		return getConfiguredForeignKeys(getTable(tableKey))
			.map(toShape)
			.sort((a, b) => a.columns.join().localeCompare(b.columns.join()))
	}

	describe('foreign keys', () => {
		test('required relation with default actions', () => {
			expect(getShapes('oneToManyOnes')).toStrictEqual([
				{
					name: 'OneToMany_One_manyId_fkey',
					columns: ['manyId'],
					foreignTable: 'OneToMany_Many',
					foreignColumns: ['id'],
					onDelete: 'restrict',
					onUpdate: 'cascade',
				},
			])
		})

		test('optional relation with default actions', () => {
			expect(getShapes('oneToOneAs')).toStrictEqual([
				{
					name: 'OneToOne_A_bId_fkey',
					columns: ['bId'],
					foreignTable: 'OneToOne_B',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
			])
		})

		test('explicit actions on a @map column and @@map tables', () => {
			expect(getShapes('foreignKeyArticles')).toContainEqual({
				name: 'fk_articles_author_id_fkey',
				columns: ['author_id'],
				foreignTable: 'fk_authors',
				foreignColumns: ['id'],
				onDelete: 'cascade',
				onUpdate: 'no action',
			})
		})

		test.skipIf(ctx.provider === 'sqlite')(
			'named constraint via @relation(map)',
			() => {
				const named = getConfiguredForeignKeys(
					getTable('foreignKeyArticles')
				).filter((fk) => fk.getName() === 'fk_articles_reviewer_custom_fkey')
				expect(named.map(toShape)).toStrictEqual([
					{
						name: 'fk_articles_reviewer_custom_fkey',
						columns: ['reviewer_id'],
						foreignTable: 'fk_authors',
						foreignColumns: ['id'],
						onDelete: 'set null',
						onUpdate: 'cascade',
					},
				])
			}
		)

		// The generator does not emit @@id, @@unique or @unique constraints yet, so
		// foreign keys pointing at them are skipped instead of breaking migrations
		describe('targets without an emitted constraint', () => {
			test('composite @@id', () => {
				expect(getShapes('foreignKeyOffices')).toStrictEqual([])
			})

			test('composite @@unique', () => {
				expect(getShapes('foreignKeyShelves')).toStrictEqual([])
			})

			test('single-column @unique', () => {
				expect(getShapes('foreignKeySessions')).toStrictEqual([])
			})

			test('composite foreign keys referencing each other', () => {
				expect(getShapes('foreignKeyHosts')).toStrictEqual([])
				expect(getShapes('foreignKeyGuests')).toStrictEqual([])
			})
		})

		test('default name longer than the identifier limit is truncated like Prisma', () => {
			const name = {
				postgres:
					'fk_a_rather_long_table_name_for_truncation_owner_column_wi_fkey',
				mysql:
					'fk_a_rather_long_table_name_for_truncation_owner_column_wit_fkey',
				sqlite:
					'fk_a_rather_long_table_name_for_truncation_owner_column_with_a_long_name_fkey',
			}[ctx.provider]
			expect(getShapes('foreignKeyLongNames')).toStrictEqual([
				{
					name,
					columns: ['owner_column_with_a_long_name'],
					foreignTable: 'fk_long_owners',
					foreignColumns: ['id'],
					onDelete: 'restrict',
					onUpdate: 'cascade',
				},
			])
		})

		test('self-reference', () => {
			expect(getShapes('selfReferences')).toStrictEqual([
				{
					name: 'SelfReference_referringManyId_fkey',
					columns: ['referringManyId'],
					foreignTable: 'SelfReference',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
				{
					name: 'SelfReference_referringUniqueId_fkey',
					columns: ['referringUniqueId'],
					foreignTable: 'SelfReference',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
			])
		})

		describe('implicit m-n join table', () => {
			test('A and B reference the models in name order', () => {
				expect(getShapes('productDetailsToTransactionHeaders')).toStrictEqual([
					{
						name: '_ProductDetailToTransactionHeader_A_fkey',
						columns: ['A'],
						foreignTable: 'ProductDetail',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
					{
						name: '_ProductDetailToTransactionHeader_B_fkey',
						columns: ['B'],
						foreignTable: 'TransactionHeader',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
				])
			})

			// MappedArticle < MappedTag by model name, while a_tags < z_articles by table name
			test('A and B follow model names, not @@map table names', () => {
				expect(getShapes('mappedArticlesToMappedTags')).toStrictEqual([
					{
						name: '_MappedArticleToMappedTag_A_fkey',
						columns: ['A'],
						foreignTable: 'z_articles',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
					{
						name: '_MappedArticleToMappedTag_B_fkey',
						columns: ['B'],
						foreignTable: 'a_tags',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
				])
			})
		})

		test('single-column foreign keys across a module import cycle', () => {
			expect(getShapes('foreignKeyChickens')).toStrictEqual([
				{
					name: 'fk_chickens_eggId_fkey',
					columns: ['eggId'],
					foreignTable: 'fk_eggs',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
			])
			expect(getShapes('foreignKeyEggs')).toStrictEqual([
				{
					name: 'fk_eggs_chickenId_fkey',
					columns: ['chickenId'],
					foreignTable: 'fk_chickens',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
			])
		})

		// Foreign key targets are lazy callbacks, so a broken import cycle only
		// surfaces when they are resolved
		test('every foreign key target resolves at runtime', () => {
			let resolved = 0
			for (const value of Object.values(ctx.schema)) {
				if (!is(value, Table)) continue
				for (const fk of getConfiguredForeignKeys(value)) {
					const reference = fk.reference()
					expect(reference.columns.length).toBeGreaterThan(0)
					expect(reference.foreignColumns).toHaveLength(
						reference.columns.length
					)
					resolved++
				}
			}
			expect(resolved).toBeGreaterThan(0)
		})

		// Postgres and MySQL name constraints, so drizzle-kit only matches a database
		// Prisma created when the generated names are identical
		describe.skipIf(ctx.provider === 'sqlite')('constraint names', () => {
			/** Foreign keys Prisma creates that are skipped because their target constraint is not generated yet */
			const gatedConstraintNames = [
				'fk_offices_country_code_region_code_fkey',
				'fk_shelves_zone_aisle_fkey',
				'fk_sessions_account_email_fkey',
				'fk_hosts_guestA_guestB_fkey',
				'fk_guests_hostA_hostB_fkey',
			]

			async function getPrismaConstraintNames() {
				const query =
					ctx.provider === 'postgres'
						? sql`select table_name as table_name, constraint_name as constraint_name from information_schema.table_constraints where constraint_type = 'FOREIGN KEY' and table_schema = current_schema()`
						: sql`select table_name as table_name, constraint_name as constraint_name from information_schema.table_constraints where constraint_type = 'FOREIGN KEY' and table_schema = database()`
				const result: unknown = await ctx.db.execute(query)
				const rows = parse(
					array(object({ table_name: string(), constraint_name: string() })),
					// mysql2 resolves to [rows, fields]
					ctx.provider === 'mysql' ? parse(array(unknown()), result)[0] : result
				)

				const names = new Map<string, string[]>()
				for (const row of rows) {
					names.set(row.table_name, [
						...(names.get(row.table_name) ?? []),
						row.constraint_name,
					])
				}
				return names
			}

			test('match the ones of the database created by Prisma', async () => {
				const prisma = await getPrismaConstraintNames()
				const drizzle = new Map<string, string[]>()
				for (const value of Object.values(ctx.schema)) {
					if (!is(value, Table)) continue
					drizzle.set(
						getTableName(value),
						getConfiguredForeignKeys(value).map((fk) => fk.getName())
					)
				}

				expect(prisma.size).toBeGreaterThan(0)
				for (const table of prisma.keys()) {
					expect(drizzle.has(table)).toBe(true)
				}
				for (const [table, names] of drizzle) {
					const expected = (prisma.get(table) ?? []).filter(
						(name) => !gatedConstraintNames.includes(name)
					)
					expect([...names].sort(), table).toStrictEqual([...expected].sort())
				}
			})

			test('skip the ones whose target constraint is not generated', async () => {
				const prismaNames = [
					...(await getPrismaConstraintNames()).values(),
				].flat()
				const drizzleNames = Object.values(ctx.schema).flatMap((value) =>
					is(value, Table)
						? getConfiguredForeignKeys(value).map((fk) => fk.getName())
						: []
				)
				for (const name of gatedConstraintNames) {
					expect(prismaNames).toContain(name)
					expect(drizzleNames).not.toContain(name)
				}
			})
		})
	})
}
