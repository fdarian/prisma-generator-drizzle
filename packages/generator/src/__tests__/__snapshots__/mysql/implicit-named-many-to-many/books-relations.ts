import { relations } from 'drizzle-orm';
import { books } from './books';
import { booksToWriters } from './books-to-writers';

export const booksRelations = relations(books, (helpers) => ({ authors: helpers.many(booksToWriters) }));