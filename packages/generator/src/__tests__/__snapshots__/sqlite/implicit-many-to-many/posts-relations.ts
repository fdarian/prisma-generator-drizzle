import { relations } from 'drizzle-orm';
import { posts } from './posts';
import { categoriesToPosts } from './categories-to-posts';

export const postsRelations = relations(posts, (helpers) => ({ categories: helpers.many(categoriesToPosts) }));