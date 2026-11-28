import { customType, mysqlEnum, mysqlTable, int, text, datetime, decimal, bigint, foreignKey } from 'drizzle-orm/mysql-core';
import { sql, relations } from 'drizzle-orm';
import type { MySqlTableExtraConfigValue } from 'drizzle-orm/mysql-core';

export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'LONGBLOB';
	},
	fromDriver(value: unknown) {
		if (Buffer.isBuffer(value)) return value
		throw new Error('Expected Buffer')
	},
	toDriver(value: Buffer) {
		return value
	}
});

export const statusEnum = (fieldName: string) => mysqlEnum(fieldName, ['DRAFT', 'PUBLISHED']);

export const authors = mysqlTable('Author', { id: int('id').primaryKey(), name: text('name').notNull(), joined: datetime('joined', { mode: 'date', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull(), balance: decimal('balance', { precision: 65, scale: 30 }).notNull() });

export const posts = mysqlTable('Post', { id: int('id').primaryKey(), authorId: int('authorId').notNull(), views: bigint('views', { mode: 'bigint' }).notNull(), payload: customBytes('payload').notNull(), updated: datetime('updated', { mode: 'date', fsp: 3 }).$onUpdate(() => new Date()).notNull(), status: statusEnum('status').default('DRAFT').notNull() }, (table): MySqlTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);

export const authorsRelations = relations(authors, (helpers) => ({ posts: helpers.many(posts, { relationName: 'AuthorToPost' }) }));

export const postsRelations = relations(posts, (helpers) => ({ author: helpers.one(authors, { relationName: 'AuthorToPost', fields: [ posts.authorId ], references: [ authors.id ] }) }));

export const schema = { authors, posts, authorsRelations, postsRelations };