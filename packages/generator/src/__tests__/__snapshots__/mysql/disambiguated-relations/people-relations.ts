import { relations } from 'drizzle-orm';
import { people } from './people';
import { articles } from './articles';

export const peopleRelations = relations(people, (helpers) => ({ writtenPosts: helpers.many(articles, { relationName: 'Author' }), editedPosts: helpers.many(articles, { relationName: 'Editor' }) }));