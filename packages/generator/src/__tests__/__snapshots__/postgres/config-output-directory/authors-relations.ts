import { relations } from 'drizzle-orm';
import { authors } from './authors';
import { posts } from './posts';

export const authorsRelations = relations(authors, (helpers) => ({ posts: helpers.many(posts, { relationName: 'AuthorToPost' }) }));