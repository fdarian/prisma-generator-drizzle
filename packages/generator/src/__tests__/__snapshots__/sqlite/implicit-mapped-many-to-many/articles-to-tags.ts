import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { articles } from './articles';
import { tags } from './tags';

export const articlesToTags = sqliteTable('_ArticleToTag', { A: integer('A', { mode: 'number' }).notNull(), B: integer('B', { mode: 'number' }).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "_ArticleToTag_A_fkey", columns: [table.A], foreignColumns: [articles.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_ArticleToTag_B_fkey", columns: [table.B], foreignColumns: [tags.id] }).onDelete('cascade').onUpdate('cascade')]);