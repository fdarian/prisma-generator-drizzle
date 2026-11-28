import { relations } from 'drizzle-orm';
import { articles } from './articles';
import { people } from './people';

export const articlesRelations = relations(articles, (helpers) => ({ author: helpers.one(people, { relationName: 'Author', fields: [ articles.authorId ], references: [ people.id ] }), editor: helpers.one(people, { relationName: 'Editor', fields: [ articles.editorId ], references: [ people.id ] }) }));