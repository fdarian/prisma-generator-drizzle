import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const intIds = sqliteTable('IntId', { id: integer('id', { mode: 'number' }).primaryKey() });