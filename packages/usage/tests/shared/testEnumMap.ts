import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export function testEnumMap({ db, schema, provider }: TestContext) {
	describe.skipIf(provider === 'sqlite')('enum @map', () => {
		// The drizzle default is only used for migrations, so the database
		// roundtrip below would pass even with a wrong one
		test('drizzle default uses the mapped db value', () => {
			expect(schema.enumMappedDefaults.value.default).toBe('db_mapped')
			if (provider === 'postgres') {
				expect(schema.enumMappedDefaults.list.default).toStrictEqual([
					'Plain',
					'db_mapped',
				])
			}
		})

		test('database default uses the mapped db value', async () => {
			const data = { id: createId() }
			await db.insert(schema.enumMappedDefaults).values(data)
			// --

			const result = await db.query.enumMappedDefaults
				.findFirst({
					where: (table, { eq }) => eq(table.id, data.id),
				})
				.then(throwIfnull)

			expect(result.value).toBe('db_mapped')
			if (provider === 'postgres') {
				expect(result.list).toStrictEqual(['Plain', 'db_mapped'])
			}

			// --
			await db
				.delete(schema.enumMappedDefaults)
				.where(eq(schema.enumMappedDefaults.id, data.id))
		})

		test('explicitly written mapped value roundtrips', async () => {
			const data = { id: createId(), value: 'db_mapped' as const }
			await db.insert(schema.enumMappedDefaults).values(data)
			// --

			const result = await db.query.enumMappedDefaults
				.findFirst({
					where: (table, { eq }) => eq(table.id, data.id),
				})
				.then(throwIfnull)

			expect(result.value).toBe('db_mapped')

			// --
			await db
				.delete(schema.enumMappedDefaults)
				.where(eq(schema.enumMappedDefaults.id, data.id))
		})
	})
}
