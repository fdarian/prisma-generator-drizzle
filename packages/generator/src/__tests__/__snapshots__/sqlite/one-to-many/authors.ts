import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const authors = sqliteTable('Author', { id: integer('id', { mode: 'number' }).primaryKey() });