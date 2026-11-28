import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import type { Email } from '../../directive-stubs';
import type { UUID } from 'node:crypto';

export const typedFields = sqliteTable('TypedFields', { id: integer('id', { mode: 'number' }).primaryKey(), email: text('email').$type<Email>().notNull(), externalId: text('externalId').$type<UUID>() });