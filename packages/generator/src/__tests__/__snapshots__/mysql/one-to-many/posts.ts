import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { authors } from './authors';

export const posts = mysqlTable('Post', { id: int('id').primaryKey(), authorId: int('authorId').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('cascade').onUpdate('restrict')]);