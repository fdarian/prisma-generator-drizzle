import { createId } from '@paralleldrive/cuid2'
import { teams } from 'prisma/drizzle/teams'
import { transfers } from 'prisma/drizzle/transfers'
import { users } from 'prisma/drizzle/users'

export const user_insert = {
	id: createId(),
	name: 'John',
	email: 'john@email.com',
	bigint: 123n,
	boolean: true,
	// precision 3
	datetime: new Date('2020-01-23T12:01:30Z'),
	// 65, 30 precision
	decimal: '0.567890123456789',
	enum: 'TypeOne',
	float: 0.123,
	json: { key: 'value' },
	createdAt: new Date(1e10),
} satisfies typeof users.$inferInsert

export const user_result: typeof users.$inferSelect = {
	...user_insert,
	teamId: null,
}

export const user2_insert = {
	id: createId(),
	name: 'Jane',
	email: 'jane@email.com',
	enum: 'TypeTwo',
	createdAt: new Date(2e10),
} satisfies typeof users.$inferInsert
export const user2_result: typeof users.$inferSelect = {
	...user2_insert,
	bigint: null,
	boolean: null,
	datetime: null,
	decimal: null,
	float: null,
	json: null,
	teamId: null,
}

export const user3_insert = {
	id: createId(),
	name: 'Bob',
	email: 'bob@email.com',
	enum: 'TypeTwo',
	createdAt: new Date(3e10),
} satisfies typeof users.$inferInsert

export const team: typeof teams.$inferInsert = {
	id: createId(),
	name: 'Team',
	createdAt: new Date(4e10),
}

export const transfer_user1_to_user2_insert: typeof transfers.$inferInsert = {
	id: createId(),
	fromId: user_insert.id,
	toId: user2_insert.id,
	createdAt: new Date(5e10),
}

export const transfer_user2_to_user1_insert: typeof transfers.$inferInsert = {
	id: createId(),
	fromId: user2_insert.id,
	toId: user_insert.id,
	createdAt: new Date(6e10),
}

export const transfer_user1_to_user3_insert: typeof transfers.$inferInsert = {
	id: createId(),
	fromId: user_insert.id,
	toId: user3_insert.id,
	createdAt: new Date(7e10),
}
