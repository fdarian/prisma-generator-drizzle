import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { relations } from '../prisma/drizzle-single/drizzle.js'

const db = drizzle({ client: new Database(':memory:'), relations })

test('queries are typed through the single-file output', () => {
	// Never executed: the in-memory database has no tables
	const query = () =>
		db.query.posts.findFirst({ with: { author: true, tags: true } })
	type Post = NonNullable<Awaited<ReturnType<typeof query>>>

	expectTypeOf<Post['author']>().toEqualTypeOf<{ id: number; name: string }>()
	expectTypeOf<Post['tags'][number]['label']>().toBeString()
})
