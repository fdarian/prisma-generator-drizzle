import { customType } from 'drizzle-orm/mysql-core';

export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'LONGBLOB';
	},
	fromDriver(value: unknown) {
		if (Buffer.isBuffer(value)) return value
		throw new Error('Expected Buffer')
	},
	toDriver(value: Buffer) {
		return value
	}
});