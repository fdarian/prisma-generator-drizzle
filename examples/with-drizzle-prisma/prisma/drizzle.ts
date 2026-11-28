import { customType, pgTable, serial, text } from 'drizzle-orm/pg-core';

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

export const users = pgTable('User', { id: serial('id').primaryKey(), email: text('email').notNull(), name: text('name') });

export const schema = { users };