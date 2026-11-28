import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const generateds = sqliteTable('Generated', { id: integer('id', { mode: 'number' }).primaryKey(), now: integer('now', { mode: 'timestamp' }).defaultNow().notNull(), uuid: text('uuid').notNull(), cuid: text('cuid').notNull(), dbValue: text('dbValue').default(sql`(lower(hex(randomblob(16))))`).notNull() });