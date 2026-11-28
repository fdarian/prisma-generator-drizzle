import { createId } from '@paralleldrive/cuid2'
import type { TestContext } from 'tests/utils/types'
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

		test('implicit m-n or join table with Int ids', async () => {
			await db.delete(schema.intAuthorsToIntBooks)
			await db.delete(schema.intAuthors)
			await db.delete(schema.intBooks)
			// --

			await db.insert(schema.intAuthors).values({ id: 1 })
			await db.insert(schema.intBooks).values({ id: 2 })
			await db.insert(schema.intAuthorsToIntBooks).values({ A: 1, B: 2 })

			const author_result = await db.query.intAuthors.findFirst({
				where: (IntAuthor, { eq }) => eq(IntAuthor.id, 1),
				with: { books: true },
			})
			expect(author_result).toStrictEqual({
				id: 1,
				books: [{ A: 1, B: 2 }],
			})
		})

		// Prisma assigns A/B by model name order (MappedArticle < MappedTag),
		// which is the reverse of the mapped table name order (a_tags < z_articles)
		test('implicit m-n or join table with @@map models', async () => {
			expect(schema).toHaveProperty('mappedArticlesToMappedTags')
			await db.delete(schema.mappedArticlesToMappedTags)
			await db.delete(schema.mappedArticles)
			await db.delete(schema.mappedTags)
			// --

			const article = { id: createId() }
			await db.insert(schema.mappedArticles).values(article)

			const tags = [{ id: createId() }, { id: createId() }].sort((a, b) =>
				a.id.localeCompare(b.id)
			)
			await db.insert(schema.mappedTags).values(tags)

			await db
				.insert(schema.mappedArticlesToMappedTags)
				.values(tags.map((tag) => ({ A: article.id, B: tag.id })))

			const article_result = await db.query.mappedArticles.findFirst({
				where: (MappedArticle, { eq }) => eq(MappedArticle.id, article.id),
				with: { tags: { with: { mappedTag: true } } },
			})
			expect(article_result?.id).toBe(article.id)
			expect(
				article_result?.tags
					.map((joined) => joined.mappedTag)
					.sort((a, b) => a.id.localeCompare(b.id))
			).toStrictEqual(tags)

			for (const tag of tags) {
				const tag_result = await db.query.mappedTags.findFirst({
					where: (MappedTag, { eq }) => eq(MappedTag.id, tag.id),
					with: { articles: { with: { mappedArticle: true } } },
				})
				expect(tag_result?.id).toBe(tag.id)
				expect(
					tag_result?.articles.map((joined) => joined.mappedArticle)
				).toStrictEqual([article])
			}
		})
	})
}
