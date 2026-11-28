import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const statusEnum = (fieldName: string) => mysqlEnum(fieldName, ['DRAFT', 'PUBLISHED']);