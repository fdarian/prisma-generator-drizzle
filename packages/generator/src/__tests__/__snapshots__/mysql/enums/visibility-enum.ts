import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const visibilityEnum = (fieldName: string) => mysqlEnum(fieldName, ['PUBLIC', 'PRIVATE']);