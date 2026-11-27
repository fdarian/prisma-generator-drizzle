/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { getCustomDefault, getCustomType } from './createField'

function fieldWithDocs(documentation: string) {
	return { name: 'sentryTraceData', documentation } as SchemaField
}

describe('getCustomType', () => {
	test.each([
		['before a doc line', 'drizzle.type viem::Address\nSome description'],
		['after a doc line', 'Some description\ndrizzle.type viem::Address'],
	])('reads drizzle.type %s', (_, documentation) => {
		const result = getCustomType(fieldWithDocs(documentation))
		expect(result?.code).toBe('.$type<Address>()')
	})

	test('throws naming the field and expected syntax without ::', () => {
		expect(() =>
			getCustomType(
				fieldWithDocs(
					'Some description\ndrizzle.type "PrismaJson.SentryTraceData"'
				)
			)
		).toThrow(
			'Invalid drizzle.type directive on field "sentryTraceData": expected "drizzle.type <module>::<Type>", got "\\"PrismaJson.SentryTraceData\\"". For a global or namespace type without a module, use `drizzle.custom { "$type": "<Type>" }`.'
		)
	})
})

describe('getCustomDefault', () => {
	test('reads drizzle.default after a doc line', () => {
		const result = getCustomDefault(
			fieldWithDocs('Some description\ndrizzle.default nanoid::nanoid')
		)
		expect(result?.code).toBe('.$defaultFn(() => nanoid())')
	})
})
