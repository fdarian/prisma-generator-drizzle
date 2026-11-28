import { auditTrailSchema } from './pg-schemas';
import { integer, text } from 'drizzle-orm/pg-core';
import { levelEnum } from './level-enum';

export const audits = auditTrailSchema.table('audit_log', { id: integer('id').primaryKey(), level: levelEnum('level').notNull(), note: text('note').notNull() });