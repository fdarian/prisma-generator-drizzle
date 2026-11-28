import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const statusEnum = (fieldName: string) => mysqlEnum(fieldName, ['active', 'in-active', 'PENDING_REVIEW']);