import { customType, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import type { PgTableExtraConfigValue } from 'drizzle-orm/pg-core';

export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'bytea';
	},
	fromDriver(value: unknown) {
		if (Buffer.isBuffer(value)) return value
		throw new Error('Expected Buffer')
	},
	toDriver(value: Buffer) {
		return value
	}
});

export const users = pgTable('User', { id: serial('id').primaryKey(), email: text('email').notNull(), name: text('name') }, (table): PgTableExtraConfigValue[] => [uniqueIndex("User_email_key").on(table.email)]);

export const schema = { users };