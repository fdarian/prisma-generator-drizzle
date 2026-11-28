import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const stringIds = sqliteTable('StringId', { id: text('id').primaryKey() });