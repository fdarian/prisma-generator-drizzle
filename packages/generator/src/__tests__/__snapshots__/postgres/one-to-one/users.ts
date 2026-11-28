import { pgTable, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('User', { id: integer('id').primaryKey() });