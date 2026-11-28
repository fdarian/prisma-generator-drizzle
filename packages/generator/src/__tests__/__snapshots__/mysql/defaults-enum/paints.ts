import { mysqlTable, int } from 'drizzle-orm/mysql-core';
import { colorEnum } from './color-enum';

export const paints = mysqlTable('Paint', { id: int('id').primaryKey(), color: colorEnum('color').default('RED').notNull(), mapped: colorEnum('mapped').default('green').notNull() });