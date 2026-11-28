import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const autoInts = sqliteTable('AutoInt', { id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }) });