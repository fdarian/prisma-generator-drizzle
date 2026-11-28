import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const places = pgTable('Place', { id: integer('id').primaryKey(), name: text('name').notNull() });