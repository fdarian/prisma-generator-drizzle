import { mysqlTable, text } from 'drizzle-orm/mysql-core';

export const compositeMappedIds = mysqlTable('CompositeMappedId', { firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });