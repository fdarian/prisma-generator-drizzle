import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable('Post', { id: integer('id', { mode: 'number' }).primaryKey() });