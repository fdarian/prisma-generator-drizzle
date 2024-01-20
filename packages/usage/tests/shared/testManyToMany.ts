import { createId } from '@paralleldrive/cuid2'
import { Db, Schema } from 'src/lib/types'
import { TestContext } from 'tests/utils/types'
import { describe, expect, test } from 'vitest'

export async function testManyToMany({ db, schema }: TestContext) {
	describe('many-to-many', () => {
		// https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#rules-for-defining-an-implicit-m-n-relation
		// https://orm.drizzle.team/docs/rqb#many-to-many
		test('implicit m-n or join table', async () => {
			expect(schema).toHaveProperty('productDetailsToTransactionHeaders')
			await db.delete(schema.productDetailsToTransactionHeaders)
			await db.delete(schema.transactionHeaders)
			await db.delete(schema.productDetails)
			// --

			const thead = { id: createId() }
			await db.insert(schema.transactionHeaders).values(thead)

			const product = { id: createId() }
			await db.insert(schema.productDetails).values(product)

			await db.insert(schema.productDetailsToTransactionHeaders).values({
				A: product.id,
				B: thead.id,
			})

			const thead_result = await db.query.transactionHeaders.findFirst({
				where: (TransactionHeader, { eq }) =>
					eq(TransactionHeader.id, thead.id),
				with: { products: true },
			})
			expect(thead_result).toStrictEqual({
				...thead,
				products: [{ A: product.id, B: thead.id }],
			})

			const product_result = await db.query.productDetails.findFirst({
				where: (ProductDetail, { eq }) => eq(ProductDetail.id, product.id),
				with: { transactions: true },
			})
			expect(product_result).toStrictEqual({
				...product,
				transactions: [{ A: product.id, B: thead.id }],
			})
		})

		test('implicit m-n or join table with custom name', async () => {
			expect(schema).toHaveProperty('categoriesToPosts')
			await db.delete(schema.categoriesToPosts)
			await db.delete(schema.categories)
			await db.delete(schema.posts)
			// --

			const category = { id: createId() }
			await db.insert(schema.categories).values(category)

			const post = { id: createId() }
			await db.insert(schema.posts).values(post)

			await db.insert(schema.categoriesToPosts).values({
				A: category.id,
				B: post.id,
			})

			const category_result = await db.query.categories.findFirst({
				where: (Categories, { eq }) => eq(Categories.id, category.id),
				with: { posts: true },
			})
			expect(category_result).toStrictEqual({
				...category,
				posts: [{ A: category.id, B: post.id }],
			})

			const post_result = await db.query.posts.findFirst({
				where: (Post, { eq }) => eq(Post.id, post.id),
				with: { categories: true },
			})
			expect(post_result).toStrictEqual({
				...post,
				categories: [{ A: category.id, B: post.id }],
			})
		})
	})
}
