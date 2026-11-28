import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import type { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export function testUniqueConstraint(ctx: TestContext) {
	describe('@unique', () => {
		test('rejects a duplicate insert', async () => {
			const ref = createId()
			await ctx.db.insert(ctx.schema.autoIncrements).values({ ref })

			await expect(
				ctx.db.insert(ctx.schema.autoIncrements).values({ ref })
			).rejects.toThrow()

			const rows = await ctx.db
				.select()
				.from(ctx.schema.autoIncrements)
				.where(eq(ctx.schema.autoIncrements.ref, ref))
			expect(rows).toHaveLength(1)

			// --
			await ctx.db
				.delete(ctx.schema.autoIncrements)
				.where(eq(ctx.schema.autoIncrements.ref, ref))
		})
	})
}
