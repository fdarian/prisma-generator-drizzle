import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const userAccounts = mysqlTable('user_accounts', { id: int('user_id').primaryKey(), firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });