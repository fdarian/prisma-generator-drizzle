import { pgTable, serial } from 'drizzle-orm/pg-core';

export const autoInts = pgTable('AutoInt', { id: serial('id').primaryKey() });