import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const unmappeds = pgTable('Unmapped', { id: integer('id').primaryKey(), fieldName: text('field_name').notNull() });