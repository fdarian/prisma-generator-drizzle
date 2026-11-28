import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { customDecimal } from './custom-decimal';

export const authors = sqliteTable('Author', { id: integer('id', { mode: 'number' }).primaryKey(), name: text('name').notNull(), joined: integer('joined', { mode: 'timestamp' }).defaultNow().notNull(), balance: customDecimal('balance').notNull() });