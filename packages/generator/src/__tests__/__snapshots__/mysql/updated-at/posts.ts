import { mysqlTable, int, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const posts = mysqlTable('Post', { id: int('id').primaryKey(), createdAt: datetime('createdAt', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull(), updatedAt: datetime('updatedAt', { mode: 'date', fsp: 3 }).$onUpdate(() => new Date()).notNull(), mappedAt: datetime('mapped_at', { mode: 'date', fsp: 3 }).$onUpdate(() => new Date()).notNull(), optionalAt: datetime('optionalAt', { mode: 'date', fsp: 3 }).$onUpdate(() => new Date()) });