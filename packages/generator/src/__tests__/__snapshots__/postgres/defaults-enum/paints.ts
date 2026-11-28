import { pgTable, integer } from 'drizzle-orm/pg-core';
import { colorEnum } from './color-enum';

export const paints = pgTable('Paint', { id: integer('id').primaryKey(), color: colorEnum('color').default('RED').notNull(), mapped: colorEnum('mapped').default('green').notNull() });