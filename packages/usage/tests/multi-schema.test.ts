import fs from 'node:fs'
import { eq } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { schema } from 'prisma/multi-schema/drizzle/schema'
import { db } from 'src/lib/postgres-multi-schema'

function readGenerated(name: string) {
	return fs.readFileSync(`./prisma/multi-schema/drizzle/${name}.ts`, 'utf-8')
}

beforeEach(async () => {
	await db.delete(schema.tagsToUsers)
	await db.delete(schema.postsToTags)
	await db.delete(schema.posts)
	await db.delete(schema.tags)
	await db.delete(schema.users)
})

describe('generated code', () => {
	test('declares one pgSchema per non-public schema', () => {
		const code = readGenerated('pg-schemas')
		expect(code).toContain("export const authSchema = pgSchema('auth')")
		expect(code).toContain("export const blogSchema = pgSchema('blog')")
		expect(code).not.toContain("pgSchema('public')")
	})

	test('attaches models and enums to their schema', () => {
		expect(readGenerated('users')).toContain("authSchema.table('User'")
		expect(readGenerated('users')).toContain(
			"import { authSchema } from './pg-schemas'"
		)
		expect(readGenerated('posts')).toContain("blogSchema.table('Post'")
		expect(readGenerated('role-enum')).toContain("authSchema.enum('Role'")
		expect(readGenerated('post-status-enum')).toContain(
			"blogSchema.enum('PostStatus'"
		)
	})

	test('keeps public models on pgTable', () => {
		expect(readGenerated('tags')).toContain("pgTable('Tag'")
		expect(readGenerated('tags')).not.toContain('pg-schemas')
	})

	test('puts the implicit join tables in the schema prisma migrates them to', () => {
		expect(readGenerated('posts-to-tags')).toContain(
			"blogSchema.table('_PostToTag'"
		)
		expect(readGenerated('tags-to-users')).toContain("pgTable('_TagToUser'")
	})

	test('does not export the schema constants from the relational index', () => {
		expect(schema).not.toHaveProperty('authSchema')
		expect(schema).not.toHaveProperty('blogSchema')
	})

	test('reports the schema on the table config', () => {
		expect(getTableConfig(schema.users).schema).toBe('auth')
		expect(getTableConfig(schema.posts).schema).toBe('blog')
		expect(getTableConfig(schema.postsToTags).schema).toBe('blog')
		expect(getTableConfig(schema.tags).schema).toBeUndefined()
		expect(getTableConfig(schema.tagsToUsers).schema).toBeUndefined()
	})
})

describe('queries', () => {
	test('inserts and selects across schemas with enum columns', async () => {
		await db.insert(schema.users).values({ id: 'u1', email: 'a@example.com' })
		await db.insert(schema.posts).values({
			id: 'p1',
			title: 'Hello',
			authorId: 'u1',
		})

		const user = await db.select().from(schema.users)
		expect(user).toStrictEqual([
			{ id: 'u1', email: 'a@example.com', role: 'MEMBER' },
		])

		const post = await db.select().from(schema.posts)
		expect(post).toStrictEqual([
			{ id: 'p1', title: 'Hello', status: 'DRAFT', authorId: 'u1' },
		])

		await db.insert(schema.users).values({
			id: 'u2',
			email: 'b@example.com',
			role: 'ADMIN',
		})
		const admins = await db.query.users.findMany({
			where: (User, { eq }) => eq(User.role, 'ADMIN'),
		})
		expect(admins.map((u) => u.id)).toStrictEqual(['u2'])
	})

	test('one-to-many relation across schemas', async () => {
		await db.insert(schema.users).values({ id: 'u1', email: 'a@example.com' })
		await db.insert(schema.posts).values([
			{ id: 'p1', title: 'One', authorId: 'u1', status: 'PUBLISHED' },
			{ id: 'p2', title: 'Two', authorId: 'u1' },
		])

		const author = await db.query.users.findFirst({
			where: (User, { eq }) => eq(User.id, 'u1'),
			with: { posts: { orderBy: (Post, { asc }) => asc(Post.id) } },
		})
		expect(author?.posts.map((p) => [p.id, p.status])).toStrictEqual([
			['p1', 'PUBLISHED'],
			['p2', 'DRAFT'],
		])

		const post = await db.query.posts.findFirst({
			where: (Post, { eq }) => eq(Post.id, 'p1'),
			with: { author: true },
		})
		expect(post?.author).toStrictEqual({
			id: 'u1',
			email: 'a@example.com',
			role: 'MEMBER',
		})
	})

	test('joins across schemas', async () => {
		await db.insert(schema.users).values({ id: 'u1', email: 'a@example.com' })
		await db.insert(schema.posts).values({
			id: 'p1',
			title: 'One',
			authorId: 'u1',
		})

		const rows = await db
			.select({ title: schema.posts.title, email: schema.users.email })
			.from(schema.posts)
			.innerJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
		expect(rows).toStrictEqual([{ title: 'One', email: 'a@example.com' }])
	})

	test('implicit many-to-many whose join table is in a non-public schema', async () => {
		await db.insert(schema.users).values({ id: 'u1', email: 'a@example.com' })
		await db.insert(schema.posts).values({
			id: 'p1',
			title: 'One',
			authorId: 'u1',
		})
		await db.insert(schema.tags).values({ id: 't1', name: 'news' })
		await db.insert(schema.postsToTags).values({ A: 'p1', B: 't1' })

		const post = await db.query.posts.findFirst({
			where: (Post, { eq }) => eq(Post.id, 'p1'),
			with: { tags: true },
		})
		expect(post?.tags).toStrictEqual([{ A: 'p1', B: 't1' }])

		const tag = await db.query.tags.findFirst({
			where: (Tag, { eq }) => eq(Tag.id, 't1'),
			with: { posts: true },
		})
		expect(tag?.posts).toStrictEqual([{ A: 'p1', B: 't1' }])
	})

	test('implicit many-to-many whose join table is in the public schema', async () => {
		await db.insert(schema.users).values({ id: 'u1', email: 'a@example.com' })
		await db.insert(schema.tags).values({ id: 't1', name: 'news' })
		await db.insert(schema.tagsToUsers).values({ A: 't1', B: 'u1' })

		const user = await db.query.users.findFirst({
			where: (User, { eq }) => eq(User.id, 'u1'),
			with: { tags: true },
		})
		expect(user?.tags).toStrictEqual([{ A: 't1', B: 'u1' }])

		const tag = await db.query.tags.findFirst({
			where: (Tag, { eq }) => eq(Tag.id, 't1'),
			with: { users: true },
		})
		expect(tag?.users).toStrictEqual([{ A: 't1', B: 'u1' }])
	})
})
