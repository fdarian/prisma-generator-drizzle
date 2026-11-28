import { Table, getTableName, is } from 'drizzle-orm'
import { getTableConfig as getMysqlTableConfig } from 'drizzle-orm/mysql-core'
import { getTableConfig as getPgTableConfig } from 'drizzle-orm/pg-core'
import { getTableConfig as getSqliteTableConfig } from 'drizzle-orm/sqlite-core'
import type { TestContext } from 'tests/utils/types'
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
	columns: string[]
	foreignTable: string
	foreignColumns: string[]
	onDelete: ForeignKeyAction | undefined
	onUpdate: ForeignKeyAction | undefined
}

export function testForeignKeys(ctx: TestContext) {
	function getTable(key: string): Table {
		const table = (ctx.schema as unknown as Record<string, unknown>)[key]
		if (!is(table, Table)) throw new Error(`${key} is not a table`)
		return table
	}

	function getConfiguredForeignKeys(table: Table): ForeignKeyLike[] {
		switch (ctx.provider) {
			case 'postgres':
				return getPgTableConfig(table as never).foreignKeys as never
			case 'mysql':
				return getMysqlTableConfig(table as never).foreignKeys as never
			case 'sqlite':
				return getSqliteTableConfig(table as never).foreignKeys as never
		}
	}

	function toShape(fk: ForeignKeyLike): ForeignKeyShape {
		const reference = fk.reference()
		return {
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
						columns: ['reviewer_id'],
						foreignTable: 'fk_authors',
						foreignColumns: ['id'],
						onDelete: 'set null',
						onUpdate: 'cascade',
					},
				])
			}
		)

		test('composite required relation referencing @@id', () => {
			expect(getShapes('foreignKeyOffices')).toStrictEqual([
				{
					columns: ['country_code', 'region_code'],
					foreignTable: 'fk_regions',
					foreignColumns: ['country', 'code'],
					onDelete: 'restrict',
					onUpdate: 'cascade',
				},
			])
		})

		test('composite optional relation referencing @@unique', () => {
			expect(getShapes('foreignKeyShelves')).toStrictEqual([
				{
					columns: ['zone', 'aisle'],
					foreignTable: 'fk_warehouses',
					foreignColumns: ['zone', 'aisle'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
			])
		})

		test('self-reference', () => {
			expect(getShapes('selfReferences')).toStrictEqual([
				{
					columns: ['referringManyId'],
					foreignTable: 'SelfReference',
					foreignColumns: ['id'],
					onDelete: 'set null',
					onUpdate: 'cascade',
				},
				{
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
						columns: ['A'],
						foreignTable: 'ProductDetail',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
					{
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
						columns: ['A'],
						foreignTable: 'z_articles',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
					{
						columns: ['B'],
						foreignTable: 'a_tags',
						foreignColumns: ['id'],
						onDelete: 'cascade',
						onUpdate: 'cascade',
					},
				])
			})
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
	})
}
