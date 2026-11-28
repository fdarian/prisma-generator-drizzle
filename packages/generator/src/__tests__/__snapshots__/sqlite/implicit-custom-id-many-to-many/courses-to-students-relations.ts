import { relations } from 'drizzle-orm';
import { coursesToStudents } from './courses-to-students';
import { courses } from './courses';
import { students } from './students';

export const coursesToStudentsRelations = relations(coursesToStudents, (helpers) => ({ course: helpers.one(courses, { fields: [ coursesToStudents.A ], references: [ courses.courseId ] }), student: helpers.one(students, { fields: [ coursesToStudents.B ], references: [ students.studentCode ] }) }));