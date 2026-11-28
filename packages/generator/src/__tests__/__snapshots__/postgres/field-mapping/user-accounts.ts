import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('user_accounts', { id: integer('user_id').primaryKey(), firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });