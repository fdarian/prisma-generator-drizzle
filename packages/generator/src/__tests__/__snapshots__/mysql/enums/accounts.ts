import { mysqlTable, int } from 'drizzle-orm/mysql-core';
import { roleEnum } from './role-enum';
import { statusEnum } from './status-enum';
import { visibilityEnum } from './visibility-enum';

export const accounts = mysqlTable('Account', { id: int('id').primaryKey(), role: roleEnum('role').notNull(), roleOpt: roleEnum('roleOpt'), roleDef: roleEnum('roleDef').default('EDITOR').notNull(), status: statusEnum('status').default('in-active').notNull(), statusOpt: statusEnum('statusOpt'), visibility: visibilityEnum('visibility').default('PRIVATE').notNull() });