import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('Member', { id: integer('id', { mode: 'number' }).primaryKey() });