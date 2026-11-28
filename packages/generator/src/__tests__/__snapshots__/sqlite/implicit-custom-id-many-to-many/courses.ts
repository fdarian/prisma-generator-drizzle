import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const courses = sqliteTable('Course', { courseId: integer('courseId', { mode: 'number' }).primaryKey(), slug: text('slug').notNull() });