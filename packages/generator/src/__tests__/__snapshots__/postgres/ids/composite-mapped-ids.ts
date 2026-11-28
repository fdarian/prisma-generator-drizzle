import { pgTable, text } from 'drizzle-orm/pg-core';

export const compositeMappedIds = pgTable('CompositeMappedId', { firstName: text('first_name').notNull(), lastName: text('lastName').notNull() });