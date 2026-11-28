import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { people } from './people';

export const articles = pgTable('Article', { id: integer('id').primaryKey(), authorId: integer('authorId').notNull(), editorId: integer('editorId') }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Article_authorId_fkey", columns: [table.authorId], foreignColumns: [people.id] }).onDelete('restrict').onUpdate('cascade'), foreignKey({ name: "Article_editorId_fkey", columns: [table.editorId], foreignColumns: [people.id] }).onDelete('set null').onUpdate('cascade')]);