import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { makeId } from '../../directive-stubs';
import { randomUUID, randomBytes } from 'node:crypto';

export const defaultFns = pgTable('DefaultFns', { id: integer('id').primaryKey(), token: text('token').$defaultFn(() => makeId()).notNull(), uuid: text('uuid').$defaultFn(() => randomUUID()).notNull(), salt: text('salt').$defaultFn(() => randomBytes(16).toString('hex')).notNull(), overridden: text('overridden').$defaultFn(() => makeId()).notNull(), optionalToken: text('optionalToken').$defaultFn(() => makeId()).notNull() });