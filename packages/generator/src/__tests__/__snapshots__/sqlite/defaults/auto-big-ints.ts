import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { customBigInt } from './custom-bigint';

export const autoBigInts = sqliteTable('AutoBigInt', { id: customBigInt('id').primaryKey() });