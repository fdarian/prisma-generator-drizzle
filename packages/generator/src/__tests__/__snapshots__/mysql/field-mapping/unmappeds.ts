import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const unmappeds = mysqlTable('Unmapped', { id: int('id').primaryKey(), fieldName: text('field_name').notNull() });