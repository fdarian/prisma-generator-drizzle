import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const books = sqliteTable('Book', { id: integer('id', { mode: 'number' }).primaryKey() });