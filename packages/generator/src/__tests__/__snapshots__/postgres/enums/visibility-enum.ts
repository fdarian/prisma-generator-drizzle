import { pgEnum } from 'drizzle-orm/pg-core';

export const visibilityEnum = pgEnum('visibility_kind', ['PUBLIC', 'PRIVATE']);