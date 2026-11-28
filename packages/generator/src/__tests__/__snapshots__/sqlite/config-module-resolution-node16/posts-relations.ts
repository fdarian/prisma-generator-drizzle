import { relations } from 'drizzle-orm';
import { posts } from './posts.js';
import { authors } from './authors.js';

export const postsRelations = relations(posts, (helpers) => ({ author: helpers.one(authors, { relationName: 'AuthorToPost', fields: [ posts.authorId ], references: [ authors.id ] }) }));