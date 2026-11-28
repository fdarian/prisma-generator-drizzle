import { mysqlTable, int, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { people } from './people';

export const articles = mysqlTable('Article', { id: int('id').primaryKey(), authorId: int('authorId').notNull(), editorId: int('editorId') }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Article_authorId_fkey", columns: [table.authorId], foreignColumns: [people.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Article_editorId_fkey", columns: [table.editorId], foreignColumns: [people.id] }).onDelete('set null').onUpdate('cascade')]);