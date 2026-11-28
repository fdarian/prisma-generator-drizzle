import { sqliteTable, integer, blob, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { customBigInt } from './custom-bigint.js';
import { authors } from './authors.js';

export const posts = sqliteTable('Post', { id: integer('id', { mode: 'number' }).primaryKey(), authorId: integer('authorId', { mode: 'number' }).notNull(), views: customBigInt('views').notNull(), payload: blob('payload', { mode: 'buffer' }).notNull(), updated: integer('updated', { mode: 'timestamp' }).$onUpdate(() => new Date()).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);