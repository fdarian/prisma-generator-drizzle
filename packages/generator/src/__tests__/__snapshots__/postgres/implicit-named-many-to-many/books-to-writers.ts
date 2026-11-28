import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { books } from './books';
import { writers } from './writers';

export const booksToWriters = pgTable('_BookWriters', { A: integer('A').notNull(), B: integer('B').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "_BookWriters_A_fkey", columns: [table.A], foreignColumns: [books.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_BookWriters_B_fkey", columns: [table.B], foreignColumns: [writers.id] }).onDelete('cascade').onUpdate('cascade')]);