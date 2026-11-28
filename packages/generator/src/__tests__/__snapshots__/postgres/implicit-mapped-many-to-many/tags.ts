import { pgTable, integer } from 'drizzle-orm/pg-core';

export const tags = pgTable('a_tags', { id: integer('id').primaryKey() });