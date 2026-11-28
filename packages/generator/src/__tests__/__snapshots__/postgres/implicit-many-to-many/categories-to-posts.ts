import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { categories } from './categories';
import { posts } from './posts';

export const categoriesToPosts = pgTable('_CategoryToPost', { A: integer('A').notNull(), B: integer('B').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "_CategoryToPost_A_fkey", columns: [table.A], foreignColumns: [categories.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_CategoryToPost_B_fkey", columns: [table.B], foreignColumns: [posts.id] }).onDelete('cascade').onUpdate('cascade')]);