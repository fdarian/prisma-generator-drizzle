import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const unmappeds = sqliteTable('Unmapped', { id: integer('id', { mode: 'number' }).primaryKey(), fieldName: text('field_name').notNull() });