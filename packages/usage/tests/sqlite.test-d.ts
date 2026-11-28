import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { schema } from 'prisma/sqlite/drizzle/schema'
import { db } from 'src/lib/sqlite'
import { throwIfnull } from 'tests/utils/query'

// The typecheck pool collects tests statically, so they must be declared in
// this file rather than registered by a shared function. The tests also run
// as regular tests, so they seed their own rows.
describe('one to one (type)', () => {
	const b: typeof schema.oneToOneBs.$inferInsert = { id: createId() }
	const a: typeof schema.oneToOneAs.$inferInsert = { id: createId(), bId: b.id }
	const c: typeof schema.oneToOneCs.$inferInsert = { id: createId(), bId: b.id }

	beforeAll(async () => {
		await db.insert(schema.oneToOneBs).values(b)
		await db.insert(schema.oneToOneCs).values(c)
		await db.insert(schema.oneToOneAs).values(a)
	})

	afterAll(async () => {
		await db.delete(schema.oneToOneAs).where(eq(schema.oneToOneAs.id, a.id))
		await db.delete(schema.oneToOneCs).where(eq(schema.oneToOneCs.id, c.id))
		await db.delete(schema.oneToOneBs).where(eq(schema.oneToOneBs.id, b.id))
	})

	test('a.b (holds foreign key - optional)', async () => {
		const result = await db.query.oneToOneAs
			.findFirst({ where: eq(schema.oneToOneAs.id, a.id), with: { b: true } })
			.then(throwIfnull)

		expectTypeOf(result.b).toBeNullable()
	})

	test('c.b (holds foreign key - required)', async () => {
		const result = await db.query.oneToOneCs
			.findFirst({ where: eq(schema.oneToOneCs.id, c.id), with: { b: true } })
			.then(throwIfnull)

		expectTypeOf(result.b).not.toBeNullable()
	})

	test('b.{a,c} (being referenced)', async () => {
		const result = await db.query.oneToOneBs
			.findFirst({
				where: eq(schema.oneToOneBs.id, b.id),
				with: { a: true, c: true },
			})
			.then(throwIfnull)

		expectTypeOf(result.a).toBeNullable()
		expectTypeOf(result.c).toBeNullable()
	})
})
