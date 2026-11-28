import { authSchema } from './pg-schemas';
import { integer } from 'drizzle-orm/pg-core';
import { roleEnum } from './role-enum';

export const sessions = authSchema.table('Session', { id: integer('id').primaryKey(), role: roleEnum('role').notNull() });