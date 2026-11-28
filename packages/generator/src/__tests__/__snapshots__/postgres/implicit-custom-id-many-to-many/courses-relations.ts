import { relations } from 'drizzle-orm';
import { courses } from './courses';
import { coursesToStudents } from './courses-to-students';

export const coursesRelations = relations(courses, (helpers) => ({ students: helpers.many(coursesToStudents) }));