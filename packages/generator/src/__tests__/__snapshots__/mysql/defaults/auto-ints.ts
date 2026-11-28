import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const autoInts = mysqlTable('AutoInt', { id: int('id').autoincrement().primaryKey() });