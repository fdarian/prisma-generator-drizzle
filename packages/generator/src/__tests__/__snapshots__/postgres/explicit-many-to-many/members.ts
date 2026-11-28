import { pgTable, integer } from 'drizzle-orm/pg-core';

export const members = pgTable('Member', { id: integer('id').primaryKey() });