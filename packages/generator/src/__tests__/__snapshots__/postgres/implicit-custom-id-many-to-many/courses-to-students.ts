import { pgTable, integer, text, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { students } from './students';

export const coursesToStudents = pgTable('_CourseToStudent', { A: integer('A').notNull(), B: text('B').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "_CourseToStudent_A_fkey", columns: [table.A], foreignColumns: [courses.courseId] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CourseToStudent_B_fkey", columns: [table.B], foreignColumns: [students.studentCode] }).onDelete('cascade').onUpdate('cascade')]);