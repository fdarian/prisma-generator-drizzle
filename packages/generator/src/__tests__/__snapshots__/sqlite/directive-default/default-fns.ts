import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { makeId } from '../../directive-stubs';
import { randomUUID, randomBytes } from 'node:crypto';

export const defaultFns = sqliteTable('DefaultFns', { id: integer('id', { mode: 'number' }).primaryKey(), token: text('token').$defaultFn(() => makeId()).notNull(), uuid: text('uuid').$defaultFn(() => randomUUID()).notNull(), salt: text('salt').$defaultFn(() => randomBytes(16).toString('hex')).notNull(), overridden: text('overridden').$defaultFn(() => makeId()).notNull(), optionalToken: text('optionalToken').$defaultFn(() => makeId()).notNull() });