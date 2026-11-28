import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('Team', { id: integer('id', { mode: 'number' }).primaryKey() });