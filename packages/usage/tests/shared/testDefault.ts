import { createId, isCuid } from '@paralleldrive/cuid2'
import { isAfter } from 'date-fns'
import Decimal from 'decimal.js'
import { eq, inArray } from 'drizzle-orm'
import { Db, Schema } from 'src/lib/types'
import { setTimeout } from 'timers/promises'
import { describe, expect, test } from 'vitest'

export function testDefault(
	db: Db,
	schema: Schema,
	type: 'sqlite' | 'postgres' | 'mysql'
) {
	describe('@default syntax', () => {
		test('@default', async () => {
			const data = { id: createId() }

			const now = new Date()
			await setTimeout(1_000) // wait for 1s so `now` will be less than `createdAt`

			await db.insert(schema.defaults).values(data)

			const result = await db.query.defaults.findFirst({
				where: (defaults, { eq }) => eq(defaults.id, data.id),
			})
			// --

			expect(result).toBeDefined()
			expect(
				isAfter(result!.createdAt, now),
				`Invalid now(), expected: ${result!.createdAt.toISOString()} to be greater than ${now.toISOString()}`
			).toBe(true)
			expect(result!.date.toISOString(), 'Invalid date').toBe(
				'2024-01-23T00:00:00.000Z'
			)
			expect(result!.int, 'Invalid int').toBe(1)
			expect(result!.boolean, 'Invalid boolean').toBe(true)
			expect(result!.string, 'Invalid string').toBe('John')
			if (type === 'postgres') {
				expect(result!.stringList, 'Invalid string list').toStrictEqual([
					'John',
					'Doe',
				])
			}
			expect(result!.bigint, 'Invalid bigint').toBe(1n)
			expect(new Decimal(result!.decimal).toString(), 'Invalid decimal').toBe(
				'1.123'
			)
			expect(result!.float, 'Invalid float').toBe(1.123)
			expect(result!.bytes.toString(), 'Invalid bytes').toBe('hello world')

			if (type !== 'sqlite') {
				expect(result!.enum, 'Invalid enum').toBe('TypeTwo')
				expect(result!.json, 'Invalid json').toStrictEqual({ foo: 'bar' })
			}

			// --
			await db.delete(schema.defaults).where(eq(schema.defaults.id, data.id))
		})

		test('custom drizzle.default', async () => {
			const data = { id: createId() }
			await db.insert(schema.defaults).values(data)
			// --

			const result = await db.query.defaults.findFirst({
				where: (defaults, { eq }) => eq(defaults.id, data.id),
				columns: { alsoId: true, salt: true },
			})

			expect(result).toBeDefined()
			expect(isCuid(result!.alsoId), 'Invalid when without custom code').toBe(
				true
			)
			expect(result!.salt.length === 32, 'Invalid when with custom code').toBe(
				true
			)

			// --
			await db.delete(schema.defaults).where(eq(schema.defaults.id, data.id))
		})

		test('incremental', async () => {
			const refs = [createId(), createId()]
			await db.transaction(async (tx) => {
				await tx.insert(schema.autoIncrements).values({ ref: refs[0] })
				await tx.insert(schema.autoIncrements).values({ ref: refs[1] })
			})
			// --

			const result1 = await db.query.autoIncrements.findFirst({
				where: (autoIncrements, { eq }) => eq(autoIncrements.ref, refs[0]),
				columns: { id: true },
			})
			expect(result1).toBeDefined()

			const result2 = await db.query.autoIncrements.findFirst({
				where: (autoIncrements, { eq }) => eq(autoIncrements.ref, refs[1]),
				columns: { id: true },
			})
			expect(result2).toBeDefined()
			expect(result2!.id).toBe(result1!.id + 1)

			// --
			await db
				.delete(schema.autoIncrements)
				.where(inArray(schema.autoIncrements.ref, refs))
		})
	})
}
