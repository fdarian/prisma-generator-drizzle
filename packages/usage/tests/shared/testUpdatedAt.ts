import { createId } from '@paralleldrive/cuid2'
import { isAfter, subSeconds } from 'date-fns'
import { eq } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export function testUpdatedAt({ db, schema, provider }: TestContext) {
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

		// sqlite has no string date mode
		describe.skipIf(provider === 'sqlite')('string mode', () => {
			// postgres and mysql both return `YYYY-MM-DD HH:MM:SS.mmm` in UTC
			function parseUtc(value: string) {
				return new Date(`${value.replace(' ', 'T')}Z`)
			}

			test('is set on insert', async () => {
				const data = { id: createId() }

				const before = subSeconds(new Date(), 2)
				await db.insert(schema.updatedAtModels).values(data)
				// --

				const result = await db.query.updatedAtModels
					.findFirst({
						where: (table, { eq }) => eq(table.id, data.id),
					})
					.then(throwIfnull)
				expect(isAfter(parseUtc(result.updatedAtString), before)).toBe(true)

				// --
				await db
					.delete(schema.updatedAtModels)
					.where(eq(schema.updatedAtModels.id, data.id))
			})

			test('advances on update', async () => {
				const data = {
					id: createId(),
					updatedAtString: '2020-01-01 00:00:00.000',
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
				expect(isAfter(parseUtc(result.updatedAtString), before)).toBe(true)

				// --
				await db
					.delete(schema.updatedAtModels)
					.where(eq(schema.updatedAtModels.id, data.id))
			})
		})
	})
}
