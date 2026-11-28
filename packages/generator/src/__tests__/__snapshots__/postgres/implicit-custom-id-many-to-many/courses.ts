import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const courses = pgTable('Course', { courseId: integer('courseId').primaryKey(), slug: text('slug').notNull() });