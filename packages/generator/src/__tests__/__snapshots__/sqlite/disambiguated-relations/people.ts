import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const people = sqliteTable('Person', { id: integer('id', { mode: 'number' }).primaryKey() });