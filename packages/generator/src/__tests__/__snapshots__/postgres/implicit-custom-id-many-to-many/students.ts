import { pgTable, text } from 'drizzle-orm/pg-core';

export const students = pgTable('Student', { studentCode: text('studentCode').primaryKey(), email: text('email').notNull() });