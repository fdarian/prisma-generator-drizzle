import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';
import { makeId } from '../../directive-stubs';
import { randomUUID, randomBytes } from 'node:crypto';

export const defaultFns = mysqlTable('DefaultFns', { id: int('id').primaryKey(), token: text('token').$defaultFn(() => makeId()).notNull(), uuid: text('uuid').$defaultFn(() => randomUUID()).notNull(), salt: text('salt').$defaultFn(() => randomBytes(16).toString('hex')).notNull(), overridden: text('overridden').$defaultFn(() => makeId()).notNull(), optionalToken: text('optionalToken').$defaultFn(() => makeId()).notNull() });