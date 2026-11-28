import { relations } from 'drizzle-orm';
import { posts } from './posts';
import { authors } from './authors';

export const postsRelations = relations(posts, (helpers) => ({ author: helpers.one(authors, { relationName: 'AuthorToPost', fields: [ posts.authorId ], references: [ authors.id ] }) }));