import { pgTable, integer, text, timestamp, decimal } from 'drizzle-orm/pg-core';

export const authors = pgTable('Author', { id: integer('id').primaryKey(), name: text('name').notNull(), joined: timestamp('joined', { mode: 'string', precision: 3 }).defaultNow().notNull(), balance: decimal('balance', { precision: 65, scale: 30 }).notNull() });