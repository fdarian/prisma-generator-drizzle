import { authSchema } from './pg-schemas';

export const roleEnum = authSchema.enum('Role', ['ADMIN', 'USER']);