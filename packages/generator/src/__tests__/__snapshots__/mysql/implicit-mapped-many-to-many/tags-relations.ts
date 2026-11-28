import { relations } from 'drizzle-orm';
import { tags } from './tags';
import { articlesToTags } from './articles-to-tags';

export const tagsRelations = relations(tags, (helpers) => ({ articles: helpers.many(articlesToTags) }));