import { createId } from '@paralleldrive/cuid2'
import { eq, inArray } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import { TestContext } from 'tests/utils/types'

export function testOneToMany({ db, schema }: TestContext) {
	const many: typeof schema.oneToManyManies.$inferInsert = { id: createId() }
	const ones: (typeof schema.oneToManyOnes.$inferInsert)[] = [
		{ id: createId(), manyId: many.id },
		{ id: createId(), manyId: many.id },
	].sort((a, b) => a.id.localeCompare(b.id))

	describe('one to many', () => {
		beforeAll(async () => {
			await db.insert(schema.oneToManyManies).values(many)
			await db.insert(schema.oneToManyOnes).values(ones[0])
			await db.insert(schema.oneToManyOnes).values(ones[1])
		})

		afterAll(async () => {
			await db
				.delete(schema.oneToManyOnes)
				.where(inArray(schema.oneToManyOnes.id, [ones[0].id, ones[1].id]))
			await db
				.delete(schema.oneToManyManies)
				.where(eq(schema.oneToManyManies.id, many.id))
		})

		test('one.many (holds foreign key)', async () => {
			for await (const data of ones) {
				const result = await db.query.oneToManyOnes
					.findFirst({
						where: (oneToManyOnes, { eq }) => eq(oneToManyOnes.id, data.id),
						with: {
							many: true,
						},
					})
					.then(throwIfnull)

				expect(result).toStrictEqual({
					...data,
					many: many,
				})
			}
		})

		test('many.ones (being referenced)', async () => {
			const result = await db.query.oneToManyManies
				.findFirst({
					where: (oneToManyManies, { eq }) => eq(oneToManyManies.id, many.id),
					with: {
						ones: {
							orderBy: (oneToManyOnes, { asc }) => asc(oneToManyOnes.id),
						},
					},
				})
				.then(throwIfnull)

			expect(result).toStrictEqual({
				...many,
				ones,
			})
		})
	})
}
