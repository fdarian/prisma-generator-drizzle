import { mysqlTable, int, bigint, datetime, foreignKey } from 'drizzle-orm/mysql-core';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';
import { customBytes } from './custom-bytes';
import { statusEnum } from './status-enum';
import { authors } from './authors';

export const posts = mysqlTable('Post', { id: int('id').primaryKey(), authorId: int('authorId').notNull(), views: bigint('views', { mode: 'bigint' }).notNull(), payload: customBytes('payload').notNull(), updated: datetime('updated', { mode: 'string', fsp: 3 }).$onUpdate(() => new Date().toISOString().replace('T', ' ').replace('Z', '')).notNull(), status: statusEnum('status').default('DRAFT').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);