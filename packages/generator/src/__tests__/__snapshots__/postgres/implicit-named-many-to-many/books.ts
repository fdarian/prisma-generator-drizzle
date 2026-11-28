import { pgTable, integer } from 'drizzle-orm/pg-core';

export const books = pgTable('Book', { id: integer('id').primaryKey() });