import { mysqlTable, int, text, json } from 'drizzle-orm/mysql-core';
import type { Email, Settings, Item } from '../../directive-stubs';
import type { UUID } from 'node:crypto';

export const typedFields = mysqlTable('TypedFields', { id: int('id').primaryKey(), email: text('email').$type<Email>().notNull(), externalId: text('externalId').$type<UUID>(), settings: json('settings').$type<Settings>().notNull(), history: json('history').$type<Settings[]>().notNull(), items: json('items').$type<Record<string, Item>>().notNull() });