import { pgTable, integer, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { authors } from './authors';

export const posts = pgTable('Post', { id: integer('id').primaryKey(), authorId: integer('authorId').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('cascade').onUpdate('restrict')]);