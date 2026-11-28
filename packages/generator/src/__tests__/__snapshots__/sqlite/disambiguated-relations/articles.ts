import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { people } from './people';

export const articles = sqliteTable('Article', { id: integer('id', { mode: 'number' }).primaryKey(), authorId: integer('authorId', { mode: 'number' }).notNull(), editorId: integer('editorId', { mode: 'number' }) }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Article_authorId_fkey", columns: [table.authorId], foreignColumns: [people.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Article_editorId_fkey", columns: [table.editorId], foreignColumns: [people.id] }).onDelete('set null').onUpdate('cascade')]);