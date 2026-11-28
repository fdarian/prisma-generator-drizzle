import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const students = sqliteTable('Student', { studentCode: text('studentCode').primaryKey(), email: text('email').notNull() });