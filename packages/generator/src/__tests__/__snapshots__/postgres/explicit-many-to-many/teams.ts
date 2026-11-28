import { pgTable, integer } from 'drizzle-orm/pg-core';

export const teams = pgTable('Team', { id: integer('id').primaryKey() });