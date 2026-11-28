import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const places = sqliteTable('Place', { id: integer('id', { mode: 'number' }).primaryKey(), name: text('name').notNull() });