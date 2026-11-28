import * as posts from './posts';
import * as categories from './categories';
import * as postsRelations from './posts-relations';
import * as categoriesRelations from './categories-relations';
import * as categoriesToPosts from './categories-to-posts';
import * as categoriesToPostsRelations from './categories-to-posts-relations';

export const schema = { ...posts, ...categories, ...postsRelations, ...categoriesRelations, ...categoriesToPosts, ...categoriesToPostsRelations };