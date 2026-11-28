import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const authors = mysqlTable('Author', { id: int('id').primaryKey() });