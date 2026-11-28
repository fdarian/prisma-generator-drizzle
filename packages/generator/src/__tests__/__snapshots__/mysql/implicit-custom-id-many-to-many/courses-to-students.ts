import { mysqlTable, int, text, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { courses } from './courses';
import { students } from './students';

export const coursesToStudents = mysqlTable('_CourseToStudent', { A: int('A').notNull(), B: text('B').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "_CourseToStudent_A_fkey", columns: [table.A], foreignColumns: [courses.courseId] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CourseToStudent_B_fkey", columns: [table.B], foreignColumns: [students.studentCode] }).onDelete('cascade').onUpdate('cascade')]);