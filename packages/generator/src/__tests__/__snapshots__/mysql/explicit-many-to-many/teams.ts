import { mysqlTable, int } from 'drizzle-orm/mysql-core';

export const teams = mysqlTable('Team', { id: int('id').primaryKey() });