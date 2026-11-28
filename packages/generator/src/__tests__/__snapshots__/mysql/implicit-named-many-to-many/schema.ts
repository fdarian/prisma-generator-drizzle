import * as books from './books';
import * as writers from './writers';
import * as booksRelations from './books-relations';
import * as writersRelations from './writers-relations';
import * as booksToWriters from './books-to-writers';
import * as booksToWritersRelations from './books-to-writers-relations';

export const schema = { ...books, ...writers, ...booksRelations, ...writersRelations, ...booksToWriters, ...booksToWritersRelations };