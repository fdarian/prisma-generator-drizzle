import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const visibles = sqliteTable('Visible', { id: integer('id', { mode: 'number' }).primaryKey(), name: text('name').notNull() });