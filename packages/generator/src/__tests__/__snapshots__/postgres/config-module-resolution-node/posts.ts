import { pgTable, integer, bigint, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { customBytes } from './custom-bytes';
import { statusEnum } from './status-enum';
import { authors } from './authors';

export const posts = pgTable('Post', { id: integer('id').primaryKey(), authorId: integer('authorId').notNull(), views: bigint('views', { mode: 'bigint' }).notNull(), payload: customBytes('payload').notNull(), updated: timestamp('updated', { mode: 'date', precision: 3 }).$onUpdate(() => new Date()).notNull(), status: statusEnum('status').default('DRAFT').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);