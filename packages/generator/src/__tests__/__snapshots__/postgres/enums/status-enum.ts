import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('Status', ['active', 'in-active', 'PENDING_REVIEW']);