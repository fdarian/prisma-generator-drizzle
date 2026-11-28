import { customType, pgEnum, pgTable, integer, text, timestamp, decimal, bigint, foreignKey } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'bytea';
	},
	fromDriver(value: unknown) {
		if (Buffer.isBuffer(value)) return value
		throw new Error('Expected Buffer')
	},
	toDriver(value: Buffer) {
		return value
	}
});

export const statusEnum = pgEnum('Status', ['DRAFT', 'PUBLISHED']);

export const authors = pgTable('Author', { id: integer('id').primaryKey(), name: text('name').notNull(), joined: timestamp('joined', { mode: 'date', precision: 3 }).defaultNow().notNull(), balance: decimal('balance', { precision: 65, scale: 30 }).notNull() });

export const posts = pgTable('Post', { id: integer('id').primaryKey(), authorId: integer('authorId').notNull(), views: bigint('views', { mode: 'bigint' }).notNull(), payload: customBytes('payload').notNull(), updated: timestamp('updated', { mode: 'date', precision: 3 }).$onUpdate(() => new Date()).notNull(), status: statusEnum('status').default('DRAFT').notNull() }, (table): PgTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);

export const authorsRelations = relations(authors, (helpers) => ({ posts: helpers.many(posts, { relationName: 'AuthorToPost' }) }));

export const postsRelations = relations(posts, (helpers) => ({ author: helpers.one(authors, { relationName: 'AuthorToPost', fields: [ posts.authorId ], references: [ authors.id ] }) }));

export const schema = { authors, posts, authorsRelations, postsRelations };