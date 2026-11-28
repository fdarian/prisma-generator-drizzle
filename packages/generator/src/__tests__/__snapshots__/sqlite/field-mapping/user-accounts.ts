import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const userAccounts = sqliteTable('user_accounts', { id: integer('user_id', { mode: 'number' }).primaryKey(), firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });