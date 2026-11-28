import { mysqlTable, text } from 'drizzle-orm/mysql-core';

export const stringIds = mysqlTable('StringId', { id: text('id').primaryKey() });