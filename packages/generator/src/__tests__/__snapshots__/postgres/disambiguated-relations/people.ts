import { pgTable, integer } from 'drizzle-orm/pg-core';

export const people = pgTable('Person', { id: integer('id').primaryKey() });