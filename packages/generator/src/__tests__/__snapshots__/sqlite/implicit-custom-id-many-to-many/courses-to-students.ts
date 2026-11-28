import { sqliteTable, integer, text, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { courses } from './courses';
import { students } from './students';

export const coursesToStudents = sqliteTable('_CourseToStudent', { A: integer('A', { mode: 'number' }).notNull(), B: text('B').notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "_CourseToStudent_A_fkey", columns: [table.A], foreignColumns: [courses.courseId] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CourseToStudent_B_fkey", columns: [table.B], foreignColumns: [students.studentCode] }).onDelete('cascade').onUpdate('cascade')]);