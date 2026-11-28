import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const visibles = pgTable('Visible', { id: integer('id').primaryKey(), name: text('name').notNull() });