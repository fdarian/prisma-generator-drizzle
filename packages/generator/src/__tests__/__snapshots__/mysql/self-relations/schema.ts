import * as employees from './employees';
import * as employeesRelations from './employees-relations';

export const schema = { ...employees, ...employeesRelations };