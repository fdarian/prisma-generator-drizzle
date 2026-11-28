import { relations } from 'drizzle-orm';
import { writers } from './writers';
import { booksToWriters } from './books-to-writers';

export const writersRelations = relations(writers, (helpers) => ({ books: helpers.many(booksToWriters) }));