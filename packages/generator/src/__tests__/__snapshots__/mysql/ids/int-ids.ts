import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const intIds = mysqlTable('IntId', { id: int('id').primaryKey() });