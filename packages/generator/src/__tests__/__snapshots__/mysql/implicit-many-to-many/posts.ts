import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const posts = mysqlTable('Post', { id: int('id').primaryKey() });