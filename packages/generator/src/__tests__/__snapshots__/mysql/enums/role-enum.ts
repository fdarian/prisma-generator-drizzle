import { mysqlEnum } from 'drizzle-orm/mysql-core';

export const roleEnum = (fieldName: string) => mysqlEnum(fieldName, ['ADMIN', 'EDITOR', 'GUEST']);