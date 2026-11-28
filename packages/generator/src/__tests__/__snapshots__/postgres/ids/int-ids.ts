import { pgTable, integer } from 'drizzle-orm/pg-core';

export const intIds = pgTable('IntId', { id: integer('id').primaryKey() });