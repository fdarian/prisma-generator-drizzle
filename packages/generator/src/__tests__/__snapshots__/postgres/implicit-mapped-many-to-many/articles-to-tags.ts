import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { tags } from './tags';

export const articlesToTags = pgTable('_ArticleToTag', { A: integer('A').notNull(), B: integer('B').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "_ArticleToTag_A_fkey", columns: [table.A], foreignColumns: [articles.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_ArticleToTag_B_fkey", columns: [table.B], foreignColumns: [tags.id] }).onDelete('cascade').onUpdate('cascade')]);