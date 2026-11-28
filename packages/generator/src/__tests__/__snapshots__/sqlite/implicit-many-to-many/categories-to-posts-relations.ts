import { relations } from 'drizzle-orm';
import { categoriesToPosts } from './categories-to-posts';
import { categories } from './categories';
import { posts } from './posts';

export const categoriesToPostsRelations = relations(categoriesToPosts, (helpers) => ({ category: helpers.one(categories, { fields: [ categoriesToPosts.A ], references: [ categories.id ] }), post: helpers.one(posts, { fields: [ categoriesToPosts.B ], references: [ posts.id ] }) }));