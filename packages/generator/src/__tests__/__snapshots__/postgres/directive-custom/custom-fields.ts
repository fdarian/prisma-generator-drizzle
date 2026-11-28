import slugify from '../../directive-stubs';
import { pgTable, integer, text, bigint, jsonb } from 'drizzle-orm/pg-core';
import type { Email, UserId, Item } from '../../directive-stubs';

export const customFields = pgTable('CustomFields', { id: integer('id').primaryKey(), email: text('email').$type<Email>().notNull(), slug: text('slug').$defaultFn(() => slugify('Untitled')).notNull(), userId: bigint('userId', { mode: 'number' }).$type<UserId>().notNull(), usage: jsonb('usage').$type<{ month: string, min: number }[]>().notNull(), data: jsonb('data').$type<{ items: Item[] }>().$defaultFn(() => ({ items: [] })).notNull() });