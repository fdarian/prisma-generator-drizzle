import { pgTable, integer, text, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { members } from './members';

export const memberships = pgTable('Membership', { teamId: integer('teamId').notNull(), memberId: integer('memberId').notNull(), role: text('role').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Membership_teamId_fkey", columns: [table.teamId], foreignColumns: [teams.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Membership_memberId_fkey", columns: [table.memberId], foreignColumns: [members.id] }).onDelete('restrict').onUpdate('cascade')]);