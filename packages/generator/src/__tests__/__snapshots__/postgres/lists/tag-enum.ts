import { pgEnum } from 'drizzle-orm/pg-core';

export const tagEnum = pgEnum('Tag', ['A', 'b']);