import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const tags = sqliteTable('a_tags', { id: integer('id', { mode: 'number' }).primaryKey() });