import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const members = mysqlTable('Member', { id: int('id').primaryKey() });