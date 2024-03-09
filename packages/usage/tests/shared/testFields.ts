import { createId } from '@paralleldrive/cuid2'
import Decimal from 'decimal.js'
import { eq } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'

export function testFields({ db, schema, provider }: TestContext) {
	type Data = typeof schema.fields.$inferInsert

	function normalizeDecimal(data: Data) {
		return {
			...data,
			...(data.decimal != null && {
				decimal: new Decimal(data.decimal).toString(),
			}),
		}
	}

	function defineData(input: typeof schema.fields.$inferInsert) {
		type Return = typeof schema.fields.$inferSelect

		let data = input as Return

		if (provider === 'sqlite') {
			const { enum: _, json, stringList, ...rest } = data
			data = rest as Return
		}

		if (provider === 'mysql') {
			const { stringList, ...rest } = data
			data = rest as Return
		}

		return data
	}

	describe('Fields', () => {
		test('all types', async () => {
			const data = defineData({
				id: createId(),
				string: 'John',
				boolean: true,
				int: 123,
				bigint: 123n,
				float: 0.123,
				// 65, 30 precision
				decimal: '0.567890123456789',
				// precision 3
				datetime: new Date('2020-01-23T12:01:30Z'),
				json: { key: 'value' },
				bytes: Buffer.from('hello world'),
				enum: 'A',
				stringList: ['John', 'Doe'],
			})
			// --

			await db.insert(schema.fields).values(data)

			const result = await db.query.fields
				.findFirst({
					where: (scalars, { eq }) => eq(scalars.id, data.id),
				})
				.then(throwIfnull)
				.then(normalizeDecimal)

			expect(result).toStrictEqual(data)

			// --
			await db.delete(schema.fields).where(eq(schema.fields.id, data.id))
		})

		test('partial', async () => {
			const data = defineData({
				id: createId(),
				boolean: true,
				float: 0.123,
				stringList: [],
			})
			// --

			await db.insert(schema.fields).values(data)

			const result = await db.query.fields
				.findFirst({
					where: (fields, { eq }) => eq(fields.id, data.id),
				})
				.then(throwIfnull)
				.then(normalizeDecimal)

			expect(result).toStrictEqual(
				defineData({
					...data,
					string: null,
					int: null,
					bigint: null,
					decimal: null,
					datetime: null,
					json: null,
					bytes: null,
					enum: null,
				})
			)

			// --
			await db.delete(schema.fields).where(eq(schema.fields.id, data.id))
		})
	})
}
