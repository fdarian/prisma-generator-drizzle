import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { authors } from './authors';

export const posts = sqliteTable('Post', { id: integer('id', { mode: 'number' }).primaryKey(), authorId: integer('authorId', { mode: 'number' }).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('cascade').onUpdate('restrict')]);