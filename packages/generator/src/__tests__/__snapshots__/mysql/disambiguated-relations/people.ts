import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const people = mysqlTable('Person', { id: int('id').primaryKey() });