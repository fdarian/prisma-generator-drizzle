import { pgTable, integer } from 'drizzle-orm/pg-core';

export const authors = pgTable('Author', { id: integer('id').primaryKey() });