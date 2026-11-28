import { mysqlTable, bigint } from 'drizzle-orm/mysql-core';

export const bigIntIds = mysqlTable('BigIntId', { id: bigint('id', { mode: 'bigint' }).primaryKey() });