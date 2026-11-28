import { mysqlTable, bigint } from 'drizzle-orm/mysql-core';

export const autoBigInts = mysqlTable('AutoBigInt', { id: bigint('id', { mode: 'bigint' }).autoincrement().primaryKey() });