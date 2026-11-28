import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const profiles = sqliteTable('Profile', { id: integer('id', { mode: 'number' }).primaryKey(), userId: integer('userId', { mode: 'number' }).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Profile_userId_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete('restrict').onUpdate('cascade')]);