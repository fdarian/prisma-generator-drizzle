import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const categories = mysqlTable('Category', { id: int('id').primaryKey() });