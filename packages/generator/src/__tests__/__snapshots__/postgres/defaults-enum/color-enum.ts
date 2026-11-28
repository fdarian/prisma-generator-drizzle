import { pgEnum } from 'drizzle-orm/pg-core';

export const colorEnum = pgEnum('Color', ['RED', 'green']);