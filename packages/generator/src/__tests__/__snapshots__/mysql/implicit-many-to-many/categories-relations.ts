import { relations } from 'drizzle-orm';
import { categories } from './categories';
import { categoriesToPosts } from './categories-to-posts';

export const categoriesRelations = relations(categories, (helpers) => ({ posts: helpers.many(categoriesToPosts) }));