import { relations } from 'drizzle-orm';
import { students } from './students';
import { coursesToStudents } from './courses-to-students';

export const studentsRelations = relations(students, (helpers) => ({ courses: helpers.many(coursesToStudents) }));