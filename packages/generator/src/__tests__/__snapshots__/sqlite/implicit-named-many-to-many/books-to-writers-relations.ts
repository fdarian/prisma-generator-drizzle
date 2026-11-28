import { relations } from 'drizzle-orm';
import { booksToWriters } from './books-to-writers';
import { books } from './books';
import { writers } from './writers';

export const booksToWritersRelations = relations(booksToWriters, (helpers) => ({ book: helpers.one(books, { fields: [ booksToWriters.A ], references: [ books.id ] }), writer: helpers.one(writers, { fields: [ booksToWriters.B ], references: [ writers.id ] }) }));