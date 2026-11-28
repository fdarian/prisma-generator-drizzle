import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { books } from './books';
import { writers } from './writers';

export const booksToWriters = sqliteTable('_BookWriters', { A: integer('A', { mode: 'number' }).notNull(), B: integer('B', { mode: 'number' }).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "_BookWriters_A_fkey", columns: [table.A], foreignColumns: [books.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_BookWriters_B_fkey", columns: [table.B], foreignColumns: [writers.id] }).onDelete('cascade').onUpdate('cascade')]);