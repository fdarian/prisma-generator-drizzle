import { createId } from '@paralleldrive/cuid2'
import { Db, Schema } from 'src/lib/types'
import { describe, test } from 'vitest'

export function testSelfReferring(db: Db, schema: Schema) {
	describe('When the model has references to itself', () => {
		test('one to one', async () => {
			const referred = {
				id: createId(),
				referringManyId: null,
				referringUniqueId: null,
			}
			await db.insert(schema.selfReferences).values(referred)

			const referring = {
				id: createId(),
				referringUniqueId: referred.id,
				referringManyId: null,
			}
			await db.insert(schema.selfReferences).values(referring)

			const referred_result = await db.query.selfReferences.findFirst({
				where: (selfReferences, { eq }) => eq(selfReferences.id, referred.id),
				with: { referringUnique: true, referredUnique: true },
			})
			expect(referred_result).not.toBeUndefined()
			expect(referred_result?.referredUnique).toStrictEqual(referring)
			expect(referred_result?.referringUnique).toStrictEqual(null)

			const referring_result = await db.query.selfReferences.findFirst({
				where: (selfReferences, { eq }) => eq(selfReferences.id, referring.id),
				with: { referringUnique: true, referredUnique: true },
			})
			expect(referring_result).not.toBeUndefined()
			expect(referring_result?.referredUnique).toStrictEqual(null)
			expect(referring_result?.referringUnique).toStrictEqual(referred)
		})

		test('one to many', async () => {
			const referred = {
				id: createId(),
				referringManyId: null,
				referringUniqueId: null,
			}
			await db.insert(schema.selfReferences).values(referred)

			const ids = [createId(), createId()].sort()

			const referring1 = {
				id: ids[0],
				referringUniqueId: null,
				referringManyId: referred.id,
			}
			await db.insert(schema.selfReferences).values(referring1)

			const referring2 = {
				id: ids[1],
				referringUniqueId: null,
				referringManyId: referred.id,
			}
			await db.insert(schema.selfReferences).values(referring2)

			const referred_result = await db.query.selfReferences.findFirst({
				where: (selfReferences, { eq }) => eq(selfReferences.id, referred.id),
				with: {
					referringMany: true,
					referredMany: {
						orderBy: (selfReferences, { asc }) => asc(selfReferences.id),
					},
				},
			})
			expect(referred_result).not.toBeUndefined()
			expect(referred_result?.referringMany).toStrictEqual(null)
			expect(referred_result?.referredMany).toStrictEqual([
				referring1,
				referring2,
			])

			const referring1_result = await db.query.selfReferences.findFirst({
				where: (selfReferences, { eq }) => eq(selfReferences.id, referring1.id),
				with: { referringMany: true, referredMany: true },
			})
			expect(referring1_result).not.toBeUndefined()
			expect(referring1_result?.referredMany).toStrictEqual([])
			expect(referring1_result?.referringMany).toStrictEqual(referred)

			const referring2_result = await db.query.selfReferences.findFirst({
				where: (selfReferences, { eq }) => eq(selfReferences.id, referring1.id),
				with: { referringMany: true, referredMany: true },
			})
			expect(referring2_result).not.toBeUndefined()
			expect(referring2_result?.referredMany).toStrictEqual([])
			expect(referring2_result?.referringMany).toStrictEqual(referred)
		})
	})
}
