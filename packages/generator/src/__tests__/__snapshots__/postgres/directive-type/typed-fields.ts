import { pgTable, integer, text, jsonb } from 'drizzle-orm/pg-core';
import type { Email, Settings, Item } from '../../directive-stubs';
import type { UUID } from 'node:crypto';

export const typedFields = pgTable('TypedFields', { id: integer('id').primaryKey(), email: text('email').$type<Email>().notNull(), externalId: text('externalId').$type<UUID>(), settings: jsonb('settings').$type<Settings>().notNull(), history: jsonb('history').$type<Settings[]>().notNull(), items: jsonb('items').$type<Record<string, Item>>().notNull() });