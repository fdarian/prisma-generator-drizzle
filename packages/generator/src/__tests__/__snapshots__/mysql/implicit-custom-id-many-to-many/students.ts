import { mysqlTable, text } from 'drizzle-orm/mysql-core';

export const students = mysqlTable('Student', { studentCode: text('studentCode').primaryKey(), email: text('email').notNull() });