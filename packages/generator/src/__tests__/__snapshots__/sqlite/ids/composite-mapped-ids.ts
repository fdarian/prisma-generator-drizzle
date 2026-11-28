import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const compositeMappedIds = sqliteTable('CompositeMappedId', { firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });