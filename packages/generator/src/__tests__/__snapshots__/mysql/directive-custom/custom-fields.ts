import slugify from '../../directive-stubs';
import { mysqlTable, int, text, bigint, json } from 'drizzle-orm/mysql-core';
import type { Email, UserId, Item } from '../../directive-stubs';

export const customFields = mysqlTable('CustomFields', { id: int('id').primaryKey(), email: text('email').$type<Email>().notNull(), slug: text('slug').$defaultFn(() => slugify('Untitled')).notNull(), userId: bigint('userId', { mode: 'number' }).$type<UserId>().notNull(), usage: json('usage').$type<{ month: string, min: number }[]>().notNull(), data: json('data').$type<{ items: Item[] }>().$defaultFn(() => ({ items: [] })).notNull() });