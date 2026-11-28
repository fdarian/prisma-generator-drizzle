import { pgTable, integer } from 'drizzle-orm/pg-core';

export const writers = pgTable('Writer', { id: integer('id').primaryKey() });