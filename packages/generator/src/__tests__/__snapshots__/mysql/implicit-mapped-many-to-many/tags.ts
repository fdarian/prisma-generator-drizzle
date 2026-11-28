import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const tags = mysqlTable('a_tags', { id: int('id').primaryKey() });