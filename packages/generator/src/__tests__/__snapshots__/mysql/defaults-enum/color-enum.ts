import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const colorEnum = (fieldName: string) => mysqlEnum(fieldName, ['RED', 'green']);