import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { articlesToTags } from './articles-to-tags';

export const articlesRelations = relations(articles, (helpers) => ({ tags: helpers.many(articlesToTags) }));