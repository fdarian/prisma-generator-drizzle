import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', ['ADMIN', 'EDITOR', 'GUEST']);