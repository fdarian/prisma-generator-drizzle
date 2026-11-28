import { pgTable, integer } from 'drizzle-orm/pg-core';

export const categories = pgTable('Category', { id: integer('id').primaryKey() });