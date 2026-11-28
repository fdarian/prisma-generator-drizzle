import { pgTable, integer, text } from 'drizzle-orm/pg-core';

export const compositeIds = pgTable('CompositeId', { tenantId: integer('tenantId').notNull(), slug: text('slug').notNull(), title: text('title').notNull() });