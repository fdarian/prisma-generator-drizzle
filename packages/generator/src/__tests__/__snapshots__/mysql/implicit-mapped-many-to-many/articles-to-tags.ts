import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { articles } from './articles';
import { tags } from './tags';

export const articlesToTags = mysqlTable('_ArticleToTag', { A: int('A').notNull(), B: int('B').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "_ArticleToTag_A_fkey", columns: [table.A], foreignColumns: [articles.id] }).onDelete('cascade').onUpdate('cascade'), foreignKey({ name: "_ArticleToTag_B_fkey", columns: [table.B], foreignColumns: [tags.id] }).onDelete('cascade').onUpdate('cascade')]);