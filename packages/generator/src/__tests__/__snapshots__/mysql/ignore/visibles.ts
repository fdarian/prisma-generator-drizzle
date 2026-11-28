import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const visibles = mysqlTable('Visible', { id: int('id').primaryKey(), name: text('name').notNull() });