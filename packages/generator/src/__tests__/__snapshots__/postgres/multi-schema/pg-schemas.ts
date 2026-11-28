import { pgSchema } from 'drizzle-orm/pg-core';

export const auditTrailSchema = pgSchema('audit-trail');

export const authSchema = pgSchema('auth');