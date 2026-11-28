import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const profiles = mysqlTable('Profile', { id: int('id').primaryKey(), userId: int('userId').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Profile_userId_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete('restrict').onUpdate('cascade')]);