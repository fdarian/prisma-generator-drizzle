import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { users } from './users';

export const profiles = pgTable('Profile', { id: integer('id').primaryKey(), userId: integer('userId').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Profile_userId_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete('restrict').onUpdate('cascade')]);