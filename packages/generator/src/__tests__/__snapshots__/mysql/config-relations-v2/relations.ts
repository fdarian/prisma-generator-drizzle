import { defineRelations } from 'drizzle-orm';
import { schema } from './schema';

export const relations = defineRelations(schema, (r) => ({
	authors: {
		posts: r.many.posts({ from: r.authors.id, to: r.posts.authorId }),
	},
	posts: {
		author: r.one.authors({ from: r.posts.authorId, to: r.authors.id, optional: false }),
	},
}));