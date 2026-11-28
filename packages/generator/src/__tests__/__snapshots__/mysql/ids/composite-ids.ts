import { mysqlTable, int, text } from 'drizzle-orm/mysql-core';

export const compositeIds = mysqlTable('CompositeId', { tenantId: int('tenantId').notNull(), slug: text('slug').notNull(), title: text('title').notNull() });