import { mysqlTable, int, text, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { teams } from './teams';
import { members } from './members';

export const memberships = mysqlTable('Membership', { teamId: int('teamId').notNull(), memberId: int('memberId').notNull(), role: text('role').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Membership_teamId_fkey", columns: [table.teamId], foreignColumns: [teams.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Membership_memberId_fkey", columns: [table.memberId], foreignColumns: [members.id] }).onDelete('restrict').onUpdate('cascade')]);