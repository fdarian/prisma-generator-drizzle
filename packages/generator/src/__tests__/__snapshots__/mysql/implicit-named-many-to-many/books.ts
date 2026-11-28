import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const books = mysqlTable('Book', { id: int('id').primaryKey() });