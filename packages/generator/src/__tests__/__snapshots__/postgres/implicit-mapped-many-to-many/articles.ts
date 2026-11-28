import { pgTable, integer } from 'drizzle-orm/pg-core';

export const articles = pgTable('z_articles', { id: integer('id').primaryKey() });