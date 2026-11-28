import * as students from './students';
import * as courses from './courses';
import * as studentsRelations from './students-relations';
import * as coursesRelations from './courses-relations';
import * as coursesToStudents from './courses-to-students';
import * as coursesToStudentsRelations from './courses-to-students-relations';

export const schema = { ...students, ...courses, ...studentsRelations, ...coursesRelations, ...coursesToStudents, ...coursesToStudentsRelations };