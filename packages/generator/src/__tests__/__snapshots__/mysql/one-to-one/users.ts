import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('User', { id: int('id').primaryKey() });