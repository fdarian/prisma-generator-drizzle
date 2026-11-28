import type { db } from './db.js'

type Db = typeof db
type Row<Query extends (...args: never[]) => Promise<unknown>> = NonNullable<
	Awaited<ReturnType<Query>>
>

test('one with required FK is non-null', () => {
	type Post = Row<typeof db.query.posts.findFirst<{ with: { author: true } }>>
	expectTypeOf<Post['author']>().toEqualTypeOf<{ id: number; name: string }>()

	type Profile = Row<
		typeof db.query.profiles.findFirst<{ with: { user: true } }>
	>
	expectTypeOf<Profile['user']>().toEqualTypeOf<{ id: number; name: string }>()
})

test('one with optional FK is nullable', () => {
	type Passport = Row<
		typeof db.query.passports.findFirst<{ with: { user: true } }>
	>
	expectTypeOf<Passport['user']>().toEqualTypeOf<{
		id: number
		name: string
	} | null>()

	type Employee = Row<
		typeof db.query.employees.findFirst<{ with: { manager: true } }>
	>
	expectTypeOf<Employee['manager']>().toEqualTypeOf<{
		id: number
		name: string
		managerId: number | null
	} | null>()
})

test('one on the non-FK side is nullable', () => {
	type User = Row<
		typeof db.query.users.findFirst<{
			with: { profile: true; passport: true }
		}>
	>
	expectTypeOf<User['profile']>().toEqualTypeOf<{
		id: number
		bio: string
		userId: number
	} | null>()
	expectTypeOf<User['passport']>().toEqualTypeOf<{
		id: number
		number: string
		userId: number | null
	} | null>()
})

test('many is an array', () => {
	type User = Row<
		typeof db.query.users.findFirst<{
			with: { posts: true; sentTransfers: true }
		}>
	>
	expectTypeOf<User['posts']>().toBeArray()
	expectTypeOf<User['posts'][number]['title']>().toBeString()
	expectTypeOf<User['sentTransfers']>().toBeArray()

	type Post = Row<typeof db.query.posts.findFirst<{ with: { tags: true } }>>
	expectTypeOf<Post['tags'][number]['label']>().toBeString()

	type Project = Row<
		typeof db.query.projects.findFirst<{ with: { tasks: true } }>
	>
	expectTypeOf<Project['tasks']>().toBeArray()
})

test('db carries the relations', () => {
	expectTypeOf<Db['query']>().toHaveProperty('postsToTags')
})
