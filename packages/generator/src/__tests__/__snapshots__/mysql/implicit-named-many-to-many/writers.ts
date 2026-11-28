import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const writers = mysqlTable('Writer', { id: int('id').primaryKey() });