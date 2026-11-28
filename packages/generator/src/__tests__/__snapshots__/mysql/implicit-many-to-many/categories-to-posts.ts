import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { categories } from './categories';
import { posts } from './posts';

export const categoriesToPosts = mysqlTable('_CategoryToPost', { A: int('A').notNull(), B: int('B').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "_CategoryToPost_A_fkey", columns: [table.A], foreignColumns: [categories.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CategoryToPost_B_fkey", columns: [table.B], foreignColumns: [posts.id] }).onDelete('cascade').onUpdate('cascade')]);