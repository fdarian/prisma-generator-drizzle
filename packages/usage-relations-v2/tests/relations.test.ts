import { schema } from '../prisma/drizzle/schema.js'
import { clearTables, db } from './db.js'

beforeEach(() => {
	clearTables()
})

test('one-to-many: user.posts and post.author', async () => {
	await db.insert(schema.users).values([{ id: 1, name: 'Ann' }])
	await db.insert(schema.posts).values([
		{ id: 1, title: 'first', authorId: 1 },
		{ id: 2, title: 'second', authorId: 1 },
	])

	const user = await db.query.users.findFirst({
		where: { id: 1 },
		with: { posts: { orderBy: { id: 'asc' } } },
	})
	expect(user?.posts.map((post) => post.title)).toEqual(['first', 'second'])

	const post = await db.query.posts.findFirst({
		where: { id: 2 },
		with: { author: true },
	})
	expect(post?.author.name).toBe('Ann')
})

test('one-to-one with required FK', async () => {
	await db.insert(schema.users).values([
		{ id: 1, name: 'Ann' },
		{ id: 2, name: 'Bob' },
	])
	await db.insert(schema.profiles).values([{ id: 1, bio: 'hi', userId: 1 }])

	const profile = await db.query.profiles.findFirst({ with: { user: true } })
	expect(profile?.user.name).toBe('Ann')

	const users = await db.query.users.findMany({
		with: { profile: true },
		orderBy: { id: 'asc' },
	})
	expect(users.map((user) => user.profile?.bio)).toEqual(['hi', undefined])
	expect(users[1].profile).toBeNull()
})

test('one-to-one with optional FK', async () => {
	await db.insert(schema.users).values([
		{ id: 1, name: 'Ann' },
		{ id: 2, name: 'Bob' },
	])
	await db.insert(schema.passports).values([
		{ id: 1, number: 'A1', userId: 1 },
		{ id: 2, number: 'B2', userId: null },
	])

	const passports = await db.query.passports.findMany({
		with: { user: true },
		orderBy: { id: 'asc' },
	})
	expect(passports[0].user?.name).toBe('Ann')
	expect(passports[1].user).toBeNull()

	const ann = await db.query.users.findFirst({
		where: { id: 1 },
		with: { passport: true },
	})
	expect(ann?.passport?.number).toBe('A1')
})

test('self relation: manager and reports', async () => {
	await db.insert(schema.employees).values([
		{ id: 1, name: 'boss', managerId: null },
		{ id: 2, name: 'a', managerId: 1 },
		{ id: 3, name: 'b', managerId: 1 },
	])

	const boss = await db.query.employees.findFirst({
		where: { id: 1 },
		with: { manager: true, reports: { orderBy: { id: 'asc' } } },
	})
	expect(boss?.manager).toBeNull()
	expect(boss?.reports.map((employee) => employee.name)).toEqual(['a', 'b'])

	const report = await db.query.employees.findFirst({
		where: { id: 2 },
		with: { manager: true },
	})
	expect(report?.manager?.name).toBe('boss')
})

test('two relations between the same models are disambiguated', async () => {
	await db.insert(schema.users).values([
		{ id: 1, name: 'Ann' },
		{ id: 2, name: 'Bob' },
	])
	await db.insert(schema.transfers).values([{ id: 1, fromId: 1, toId: 2 }])

	const transfer = await db.query.transfers.findFirst({
		with: { from: true, to: true },
	})
	expect(transfer?.from.name).toBe('Ann')
	expect(transfer?.to.name).toBe('Bob')

	const users = await db.query.users.findMany({
		with: { sentTransfers: true, receivedTransfers: true },
		orderBy: { id: 'asc' },
	})
	expect(users.map((user) => user.sentTransfers.length)).toEqual([1, 0])
	expect(users.map((user) => user.receivedTransfers.length)).toEqual([0, 1])
})

test('implicit many-to-many through the join table', async () => {
	await db.insert(schema.users).values([{ id: 1, name: 'Ann' }])
	await db.insert(schema.posts).values([
		{ id: 1, title: 'p1', authorId: 1 },
		{ id: 2, title: 'p2', authorId: 1 },
	])
	await db.insert(schema.tags).values([
		{ id: 1, label: 'x' },
		{ id: 2, label: 'y' },
	])
	// Prisma names the join columns A (first model alphabetically: Post) and B (Tag)
	await db.insert(schema.postsToTags).values([
		{ A: '1', B: '1' },
		{ A: '1', B: '2' },
		{ A: '2', B: '2' },
	])

	const post = await db.query.posts.findFirst({
		where: { id: 1 },
		with: { tags: { orderBy: { id: 'asc' } } },
	})
	expect(post?.tags.map((tag) => tag.label)).toEqual(['x', 'y'])

	const tag = await db.query.tags.findFirst({
		where: { id: 2 },
		with: { posts: { orderBy: { id: 'asc' } } },
	})
	expect(tag?.posts.map((p) => p.title)).toEqual(['p1', 'p2'])
})

test('composite foreign key', async () => {
	await db.insert(schema.projects).values([
		{ orgId: 1, code: 'A' },
		{ orgId: 1, code: 'B' },
		{ orgId: 2, code: 'A' },
	])
	await db.insert(schema.tasks).values([
		{ id: 1, orgId: 1, projectCode: 'A' },
		{ id: 2, orgId: 2, projectCode: 'A' },
		{ id: 3, orgId: 1, projectCode: 'A' },
	])

	const project = await db.query.projects.findFirst({
		where: { orgId: 1, code: 'A' },
		with: { tasks: { orderBy: { id: 'asc' } } },
	})
	expect(project?.tasks.map((task) => task.id)).toEqual([1, 3])

	const task = await db.query.tasks.findFirst({
		where: { id: 2 },
		with: { project: true },
	})
	expect(task?.project).toEqual({ orgId: 2, code: 'A' })
})
