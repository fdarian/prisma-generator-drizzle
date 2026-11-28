import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { customBigInt } from './custom-bigint';

export const bigIntIds = sqliteTable('BigIntId', { id: customBigInt('id').primaryKey() });