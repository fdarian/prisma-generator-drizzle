import { mysqlTable, int, text, datetime, decimal } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const authors = mysqlTable('Author', { id: int('id').primaryKey(), name: text('name').notNull(), joined: datetime('joined', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull(), balance: decimal('balance', { precision: 65, scale: 30 }).notNull() });