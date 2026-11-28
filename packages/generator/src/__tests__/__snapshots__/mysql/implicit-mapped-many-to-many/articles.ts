import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const articles = mysqlTable('z_articles', { id: int('id').primaryKey() });