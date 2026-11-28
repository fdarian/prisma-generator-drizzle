import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const courses = mysqlTable('Course', { courseId: int('courseId').primaryKey(), slug: text('slug').notNull() });