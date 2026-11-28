import { createId } from '@paralleldrive/cuid2'
import { getTableName } from 'drizzle-orm'
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

		test('implicit m-n join table names are unchanged when it is the only relation between a pair', () => {
			expect(schema).toHaveProperty('productDetailsToTransactionHeaders')
			expect(schema).toHaveProperty('categoriesToPosts')
			expect(schema).toHaveProperty('mappedArticlesToMappedTags')
			expect(schema).toHaveProperty('peopleToPeople')
			expect(schema).toHaveProperty('nodesToNodes')
			expect(schema).toHaveProperty('accountsToAccountsBlocks')
			expect(schema).toHaveProperty('accountsToAccountsMutes')
			expect(schema).not.toHaveProperty('accountsToAccounts')
		})

		// Prisma assigns side A to the self relation field whose name sorts first (`followers`),
		// and stores the owner of the side A field in column A
		test('implicit self m-n', async () => {
			await db.delete(schema.peopleToPeople)
			await db.delete(schema.people)
			// --

			const x = { id: 1 }
			const y = { id: 2 }
			await db.insert(schema.people).values([x, y])

			// x follows y => x is in y.followers
			await db.insert(schema.peopleToPeople).values({ A: y.id, B: x.id })

			const x_result = await db.query.people.findFirst({
				where: (Person, operators) => operators.eq(Person.id, x.id),
				with: {
					followers: { with: { personB: true } },
					following: { with: { personA: true } },
				},
			})
			expect(x_result?.followers).toStrictEqual([])
			expect(x_result?.following.map((joined) => joined.personA)).toStrictEqual(
				[y]
			)

			const y_result = await db.query.people.findFirst({
				where: (Person, operators) => operators.eq(Person.id, y.id),
				with: {
					followers: { with: { personB: true } },
					following: { with: { personA: true } },
				},
			})
			expect(y_result?.followers.map((joined) => joined.personB)).toStrictEqual(
				[x]
			)
			expect(y_result?.following).toStrictEqual([])
		})

		// Prisma sorts by byte order, so `Zeta` is side A even though `beta` sorts first by locale order.
		// Side A reads the owner's id from column A and the related id from column B
		test('implicit self m-n picks the sides by byte order of the field names', async () => {
			await db.delete(schema.nodesToNodes)
			await db.delete(schema.nodes)
			// --

			const x = { id: 1 }
			const y = { id: 2 }
			await db.insert(schema.nodes).values([x, y])

			// y is in x.Zeta
			await db.insert(schema.nodesToNodes).values({ A: x.id, B: y.id })

			const x_result = await db.query.nodes.findFirst({
				where: (Node, operators) => operators.eq(Node.id, x.id),
				with: {
					Zeta: { with: { nodeB: true } },
					beta: { with: { nodeA: true } },
				},
			})
			expect(x_result?.Zeta.map((joined) => joined.nodeB)).toStrictEqual([y])
			expect(x_result?.beta).toStrictEqual([])

			const y_result = await db.query.nodes.findFirst({
				where: (Node, operators) => operators.eq(Node.id, y.id),
				with: {
					Zeta: { with: { nodeB: true } },
					beta: { with: { nodeA: true } },
				},
			})
			expect(y_result?.Zeta).toStrictEqual([])
			expect(y_result?.beta.map((joined) => joined.nodeA)).toStrictEqual([x])
		})

		test('multiple implicit self m-n on the same model', async () => {
			await db.delete(schema.accountsToAccountsBlocks)
			await db.delete(schema.accountsToAccountsMutes)
			await db.delete(schema.accounts)
			// --

			const x = { id: 1 }
			const y = { id: 2 }
			await db.insert(schema.accounts).values([x, y])

			// x blocks y, y mutes x
			await db
				.insert(schema.accountsToAccountsBlocks)
				.values({ A: x.id, B: y.id })
			await db
				.insert(schema.accountsToAccountsMutes)
				.values({ A: y.id, B: x.id })

			const x_result = await db.query.accounts.findFirst({
				where: (Account, operators) => operators.eq(Account.id, x.id),
				with: {
					blocked: { with: { accountB: true } },
					mutedBy: { with: { accountA: true } },
					muted: true,
					blockedBy: true,
				},
			})
			expect(x_result?.blocked.map((joined) => joined.accountB)).toStrictEqual([
				y,
			])
			expect(x_result?.mutedBy.map((joined) => joined.accountA)).toStrictEqual([
				y,
			])
			expect(x_result?.muted).toStrictEqual([])
			expect(x_result?.blockedBy).toStrictEqual([])
		})

		test('multiple implicit m-n between the same pair of models', async () => {
			expect(schema).toHaveProperty('authorsToBooksLikes')
			expect(schema).toHaveProperty('authorsToBooksSaves')
			expect(schema).not.toHaveProperty('authorsToBooks')
			expect(getTableName(schema.authorsToBooksLikes)).not.toBe(
				getTableName(schema.authorsToBooksSaves)
			)

			await db.delete(schema.authorsToBooksLikes)
			await db.delete(schema.authorsToBooksSaves)
			await db.delete(schema.authors)
			await db.delete(schema.books)
			// --

			const author = { id: createId() }
			await db.insert(schema.authors).values(author)

			const liked = { id: createId() }
			const saved = { id: createId() }
			await db.insert(schema.books).values([liked, saved])

			await db
				.insert(schema.authorsToBooksLikes)
				.values({ A: author.id, B: liked.id })
			await db
				.insert(schema.authorsToBooksSaves)
				.values({ A: author.id, B: saved.id })

			const author_result = await db.query.authors.findFirst({
				where: (Author, operators) => operators.eq(Author.id, author.id),
				with: {
					liked: { with: { book: true } },
					saved: { with: { book: true } },
				},
			})
			expect(author_result?.liked.map((joined) => joined.book)).toStrictEqual([
				liked,
			])
			expect(author_result?.saved.map((joined) => joined.book)).toStrictEqual([
				saved,
			])

			const liked_result = await db.query.books.findFirst({
				where: (Book, operators) => operators.eq(Book.id, liked.id),
				with: {
					likedBy: { with: { author: true } },
					savedBy: true,
				},
			})
			expect(
				liked_result?.likedBy.map((joined) => joined.author)
			).toStrictEqual([author])
			expect(liked_result?.savedBy).toStrictEqual([])
		})
	})
}
