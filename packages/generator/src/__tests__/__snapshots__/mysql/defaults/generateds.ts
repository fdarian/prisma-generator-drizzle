import { mysqlTable, int, datetime, text } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const generateds = mysqlTable('Generated', { id: int('id').primaryKey(), now: datetime('now', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull(), uuid: text('uuid').notNull(), cuid: text('cuid').notNull(), dbValue: text('dbValue').default(sql`(uuid())`).notNull() });