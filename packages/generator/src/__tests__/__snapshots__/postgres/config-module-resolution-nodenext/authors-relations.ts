import { relations } from 'drizzle-orm';
import { authors } from './authors.js';
import { posts } from './posts.js';

export const authorsRelations = relations(authors, (helpers) => ({ posts: helpers.many(posts, { relationName: 'AuthorToPost' }) }));