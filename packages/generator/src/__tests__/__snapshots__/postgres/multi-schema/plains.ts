import { pgTable, integer } from 'drizzle-orm/pg-core';

export const plains = pgTable('Plain', { id: integer('id').primaryKey() });