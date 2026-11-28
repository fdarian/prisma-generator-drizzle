import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const compositeIds = sqliteTable('CompositeId', { tenantId: integer('tenantId', { mode: 'number' }).notNull(), slug: text('slug').notNull(), title: text('title').notNull() });