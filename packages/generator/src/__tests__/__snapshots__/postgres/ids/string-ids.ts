import { pgTable, text } from 'drizzle-orm/pg-core';

export const stringIds = pgTable('StringId', { id: text('id').primaryKey() });