import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const writers = sqliteTable('Writer', { id: integer('id', { mode: 'number' }).primaryKey() });