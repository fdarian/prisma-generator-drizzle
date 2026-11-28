import { sqliteTable, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { categories } from './categories';
import { posts } from './posts';

export const categoriesToPosts = sqliteTable('_CategoryToPost', { A: integer('A', { mode: 'number' }).notNull(), B: integer('B', { mode: 'number' }).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "_CategoryToPost_A_fkey", columns: [table.A], foreignColumns: [categories.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CategoryToPost_B_fkey", columns: [table.B], foreignColumns: [posts.id] }).onDelete('cascade').onUpdate('cascade')]);