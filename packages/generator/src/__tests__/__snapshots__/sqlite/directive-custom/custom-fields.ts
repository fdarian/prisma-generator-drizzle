import slugify from '../../directive-stubs';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import type { Email, UserId } from '../../directive-stubs';
import { customBigInt } from './custom-bigint';

export const customFields = sqliteTable('CustomFields', { id: integer('id', { mode: 'number' }).primaryKey(), email: text('email').$type<Email>().notNull(), slug: text('slug').$defaultFn(() => slugify('Untitled')).notNull(), userId: customBigInt('userId').$type<UserId>().notNull() });