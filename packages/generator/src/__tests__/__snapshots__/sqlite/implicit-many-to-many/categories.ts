import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('Category', { id: integer('id', { mode: 'number' }).primaryKey() });