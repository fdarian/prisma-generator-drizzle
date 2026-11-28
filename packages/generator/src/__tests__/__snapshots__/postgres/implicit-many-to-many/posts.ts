import { pgTable, integer } from 'drizzle-orm/pg-core';

export const posts = pgTable('Post', { id: integer('id').primaryKey() });