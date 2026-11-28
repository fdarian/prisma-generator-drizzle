import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('User', { id: integer('id', { mode: 'number' }).primaryKey() });