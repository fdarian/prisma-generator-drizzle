import { sqliteTable, integer, text, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { teams } from './teams';
import { members } from './members';

export const memberships = sqliteTable('Membership', { teamId: integer('teamId', { mode: 'number' }).notNull(), memberId: integer('memberId', { mode: 'number' }).notNull(), role: text('role').notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Membership_teamId_fkey", columns: [table.teamId], foreignColumns: [teams.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Membership_memberId_fkey", columns: [table.memberId], foreignColumns: [members.id] }).onDelete('restrict').onUpdate('cascade')]);