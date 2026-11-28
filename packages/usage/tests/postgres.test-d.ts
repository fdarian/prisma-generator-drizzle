import type { db } from 'src/lib/postgres'

// The bodies below only use types. vitest 1.6 also executes *.test-d.ts at
// runtime, so nothing here may touch the database: the queries are wrapped in
// functions that are never called, and `db` is imported as a type.
declare const query: (typeof db)['query']

const findA = () => query.oneToOneAs.findFirst({ with: { b: true } })
const findC = () => query.oneToOneCs.findFirst({ with: { b: true } })
const findB = () => query.oneToOneBs.findFirst({ with: { a: true, c: true } })

type Found<Find extends () => Promise<unknown>> = NonNullable<
	Awaited<ReturnType<Find>>
>

describe('one to one (type)', () => {
	test('a.b (holds foreign key - optional)', () => {
		expectTypeOf<Found<typeof findA>['b']>().toBeNullable()
	})

	test('c.b (holds foreign key - required)', () => {
		expectTypeOf<Found<typeof findC>['b']>().not.toBeNullable()
	})

	test('b.{a,c} (being referenced)', () => {
		expectTypeOf<Found<typeof findB>['a']>().toBeNullable()
		expectTypeOf<Found<typeof findB>['c']>().toBeNullable()
	})
})
