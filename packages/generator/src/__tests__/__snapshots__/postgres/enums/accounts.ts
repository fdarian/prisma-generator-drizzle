import { pgTable, integer } from 'drizzle-orm/pg-core';
import { roleEnum } from './role-enum';
import { statusEnum } from './status-enum';
import { visibilityEnum } from './visibility-enum';

export const accounts = pgTable('Account', { id: integer('id').primaryKey(), role: roleEnum('role').notNull(), roleOpt: roleEnum('roleOpt'), roleDef: roleEnum('roleDef').default('EDITOR').notNull(), status: statusEnum('status').default('in-active').notNull(), statusOpt: statusEnum('statusOpt'), visibility: visibilityEnum('visibility').default('PRIVATE').notNull() });