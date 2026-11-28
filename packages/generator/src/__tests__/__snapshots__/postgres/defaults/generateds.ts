import { pgTable, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const generateds = pgTable('Generated', { id: integer('id').primaryKey(), now: timestamp('now', { mode: 'date', precision: 3 }).defaultNow().notNull(), uuid: text('uuid').notNull(), cuid: text('cuid').notNull(), dbValue: text('dbValue').default(sql`gen_random_uuid()`).notNull() });