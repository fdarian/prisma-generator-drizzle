import { pgTable, bigserial } from 'drizzle-orm/pg-core';

export const autoBigInts = pgTable('AutoBigInt', { id: bigserial('id', { mode: 'bigint' }).primaryKey() });