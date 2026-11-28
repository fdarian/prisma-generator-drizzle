import { pgTable, bigint } from 'drizzle-orm/pg-core';

export const bigIntIds = pgTable('BigIntId', { id: bigint('id', { mode: 'bigint' }).primaryKey() });