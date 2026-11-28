import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('z_articles', { id: integer('id', { mode: 'number' }).primaryKey() });