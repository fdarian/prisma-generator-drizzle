import { type SQL, eq, sql } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'
import { array, parse, record, string, unknown } from 'valibot'
import { afterEach, describe, expect, test } from 'vitest'

export function testFieldMap({ db, schema, provider }: TestContext) {
	const fields = schema.mappedFields
	const parents = schema.mappedFieldParents

	const parent: typeof parents.$inferSelect = { id: 9001, name: 'parent' }

	// SQLite has no enums, so the model has no status column there
	function defineField(input: { id: number; label: string }) {
		return {
			...input,
			parentId: parent.id,
			...(provider === 'sqlite' ? {} : { status: 'Active' }),
		} as typeof fields.$inferSelect
	}

	const field = defineField({ id: 9002, label: 'child' })

	async function selectRaw(query: SQL) {
		const rows = await (async () => {
			if (provider === 'sqlite') {
				return (db as unknown as { all(query: SQL): unknown }).all(query)
			}
			const result = await db.execute(query)
			// mysql2 resolves to [rows, fields]
			return provider === 'mysql' ? parse(array(unknown()), result)[0] : result
		})()
		return parse(array(record(string(), unknown())), rows)
	}

	function selectRawRows(table: string, idColumn: string, id: number) {
		return selectRaw(
			sql`select * from ${sql.identifier(table)} where ${sql.identifier(idColumn)} = ${id}`
		)
	}

	describe('field @map', () => {
		afterEach(async () => {
			await db.delete(fields).where(eq(fields.id, field.id))
			await db.delete(parents).where(eq(parents.id, parent.id))
		})

		async function insertBoth() {
			await db.insert(parents).values(parent)
			await db.insert(fields).values(field)
		}

		test('round trips through the TS keys', async () => {
			await insertBoth()

			const result = await db.query.mappedFields
				.findFirst({ where: (table, { eq }) => eq(table.id, field.id) })
				.then(throwIfnull)

			expect(result).toStrictEqual(field)
		})

		test('queries the relation made on a mapped column', async () => {
			await insertBoth()

			const fieldResult = await db.query.mappedFields
				.findFirst({
					where: (table, { eq }) => eq(table.id, field.id),
					with: { parent: true },
				})
				.then(throwIfnull)
			expect(fieldResult).toStrictEqual({ ...field, parent })

			const parentResult = await db.query.mappedFieldParents
				.findFirst({
					where: (table, { eq }) => eq(table.id, parent.id),
					with: { children: true },
				})
				.then(throwIfnull)
			expect(parentResult).toStrictEqual({ ...parent, children: [field] })
		})

		test('filters on the mapped column', async () => {
			await insertBoth()

			const rows = await db
				.select()
				.from(fields)
				.where(eq(fields.parentId, parent.id))
			expect(rows).toStrictEqual([field])
		})

		test('names the columns of the database after the mapped names', async () => {
			await insertBoth()

			const fieldRows = await selectRawRows(
				'MappedField',
				'mapped_id',
				field.id
			)
			expect(fieldRows).toStrictEqual([
				{
					mapped_id: field.id,
					mapped_label: field.label,
					...(provider === 'sqlite' ? {} : { mapped_status: 'Active' }),
					parent_id: parent.id,
				},
			])

			const parentRows = await selectRawRows(
				'MappedFieldParent',
				'parent_pk',
				parent.id
			)
			expect(parentRows).toStrictEqual([
				{ parent_pk: parent.id, parent_name: parent.name },
			])
		})
	})
}
