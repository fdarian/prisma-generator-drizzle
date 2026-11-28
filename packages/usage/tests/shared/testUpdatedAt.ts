import { createId } from '@paralleldrive/cuid2'
import { isAfter, subSeconds } from 'date-fns'
import { eq } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export function testUpdatedAt({ db, schema }: TestContext) {
	describe('@updatedAt', () => {
		test('is set on insert', async () => {
			const data = { id: createId() }

			// sqlite stores timestamps with second precision
			const before = subSeconds(new Date(), 2)
			await db.insert(schema.updatedAtModels).values(data)
			// --

			const result = await db.query.updatedAtModels
				.findFirst({
					where: (table, { eq }) => eq(table.id, data.id),
				})
				.then(throwIfnull)
			expect(isAfter(result.updatedAt, before)).toBe(true)

			// --
			await db
				.delete(schema.updatedAtModels)
				.where(eq(schema.updatedAtModels.id, data.id))
		})

		test('advances on update', async () => {
			const data = {
				id: createId(),
				updatedAt: new Date('2020-01-01T00:00:00Z'),
			}
			await db.insert(schema.updatedAtModels).values(data)

			const before = subSeconds(new Date(), 2)
			await db
				.update(schema.updatedAtModels)
				.set({ name: 'changed' })
				.where(eq(schema.updatedAtModels.id, data.id))
			// --

			const result = await db.query.updatedAtModels
				.findFirst({
					where: (table, { eq }) => eq(table.id, data.id),
				})
				.then(throwIfnull)
			expect(result.name).toBe('changed')
			expect(isAfter(result.updatedAt, before)).toBe(true)

			// --
			await db
				.delete(schema.updatedAtModels)
				.where(eq(schema.updatedAtModels.id, data.id))
		})
	})
}
