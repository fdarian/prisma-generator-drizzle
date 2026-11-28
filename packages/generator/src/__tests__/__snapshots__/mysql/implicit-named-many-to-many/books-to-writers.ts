import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { books } from './books';
import { writers } from './writers';

export const booksToWriters = mysqlTable('_BookWriters', { A: int('A').notNull(), B: int('B').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "_BookWriters_A_fkey", columns: [table.A], foreignColumns: [books.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_BookWriters_B_fkey", columns: [table.B], foreignColumns: [writers.id] }).onDelete('cascade').onUpdate('cascade')]);