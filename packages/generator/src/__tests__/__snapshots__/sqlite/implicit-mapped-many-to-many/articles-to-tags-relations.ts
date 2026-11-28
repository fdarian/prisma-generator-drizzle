import { relations } from 'drizzle-orm';
import { articlesToTags } from './articles-to-tags';
import { articles } from './articles';
import { tags } from './tags';

export const articlesToTagsRelations = relations(articlesToTags, (helpers) => ({ article: helpers.one(articles, { fields: [ articlesToTags.A ], references: [ articles.id ] }), tag: helpers.one(tags, { fields: [ articlesToTags.B ], references: [ tags.id ] }) }));