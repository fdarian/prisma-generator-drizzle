import { customType, sqliteTable, integer, text, blob, foreignKey } from 'drizzle-orm/sqlite-core';
import type { SQLiteTableExtraConfigValue } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const customDecimal = customType<{ data: string }>(
  {
    dataType() {
      return 'DECIMAL';
    },
    fromDriver(value: unknown) {
      return String(value)
    },
    toDriver(value: string) {
      return Number(value)
    },
  },
);

export const customBigInt = customType<{ data: bigint }>(
  {
    dataType() {
      return 'INTEGER';
    },
    fromDriver(value: unknown): bigint {
      if (typeof value !== 'number') {
        throw new Error('Expected number type for INTEGER')
      }
      return BigInt(value);
    },
    toDriver(value: bigint): number {
      return Number(value);
    }
  },
);

export const authors = sqliteTable('Author', { id: integer('id', { mode: 'number' }).primaryKey(), name: text('name').notNull(), joined: integer('joined', { mode: 'timestamp' }).defaultNow().notNull(), balance: customDecimal('balance').notNull() });

export const posts = sqliteTable('Post', { id: integer('id', { mode: 'number' }).primaryKey(), authorId: integer('authorId', { mode: 'number' }).notNull(), views: customBigInt('views').notNull(), payload: blob('payload', { mode: 'buffer' }).notNull(), updated: integer('updated', { mode: 'timestamp' }).$onUpdate(() => new Date()).notNull() }, (table): SQLiteTableExtraConfigValue[] => [foreignKey({ name: "Post_authorId_fkey", columns: [table.authorId], foreignColumns: [authors.id] }).onDelete('restrict').onUpdate('cascade')]);

export const authorsRelations = relations(authors, (helpers) => ({ posts: helpers.many(posts, { relationName: 'AuthorToPost' }) }));

export const postsRelations = relations(posts, (helpers) => ({ author: helpers.one(authors, { relationName: 'AuthorToPost', fields: [ posts.authorId ], references: [ authors.id ] }) }));

export const schema = { authors, posts, authorsRelations, postsRelations };