import { pgEnum } from 'drizzle-orm/pg-core';

export const levelEnum = pgEnum('Level', ['LOW', 'HIGH']);