import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const places = mysqlTable('Place', { id: int('id').primaryKey(), name: text('name').notNull() });