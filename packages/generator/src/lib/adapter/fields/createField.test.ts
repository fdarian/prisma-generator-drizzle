import { describe, expect, it } from 'vitest'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { createField, getCustomDefault, getCustomType } from './createField'

function fieldWithDocs(documentation: string) {
	return { name: 'sentryTraceData', documentation } as SchemaField
}

describe('getCustomType', () => {
	it.each([
		['before a doc line', 'drizzle.type viem::Address\nSome description'],
		['after a doc line', 'Some description\ndrizzle.type viem::Address'],
	])('reads drizzle.type %s', (_, documentation) => {
		const result = getCustomType(fieldWithDocs(documentation))
		expect(result?.code).toBe('.$type<Address>()')
	})

	it('throws naming the field and expected syntax without ::', () => {
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

describe('getCustomType type expressions', () => {
	it.each([
		['plain', 'mod::Item', '.$type<Item>()', ['Item']],
		['array suffix', 'mod::Item[]', '.$type<Item[]>()', ['Item']],
		['Array generic', 'mod::Array<Item>', '.$type<Array<Item>>()', ['Item']],
		['indexed access', "mod::Item['key']", ".$type<Item['key']>()", ['Item']],
		[
			'two type names',
			'mod::Map<Key, Value>',
			'.$type<Map<Key, Value>>()',
			['Key', 'Value'],
		],
	])('%s', (_, directive, code, names) => {
		const result = getCustomType(fieldWithDocs(`drizzle.type ${directive}`))
		expect(result?.code).toBe(code)
		expect(result?.imports.names).toEqual(names)
		expect(result?.imports.module).toBe('mod')
		expect(result?.imports.isTypeImport).toBe(true)
	})

	it('keeps a relative module path', () => {
		const result = getCustomType(
			fieldWithDocs('drizzle.type ../my-type::Email')
		)
		expect(result?.code).toBe('.$type<Email>()')
		expect(result?.imports.module).toBe('../my-type')
		expect(result?.imports.names).toEqual(['Email'])
	})

	it('reads an array expression among doc lines', () => {
		const result = getCustomType(
			fieldWithDocs('Some description\ndrizzle.type mod::Item[]\nMore text')
		)
		expect(result?.code).toBe('.$type<Item[]>()')
	})

	it('throws when the expression imports nothing', () => {
		expect(() =>
			getCustomType(fieldWithDocs('drizzle.type mod::string[]'))
		).toThrow(
			'Invalid drizzle.type directive on field "sentryTraceData": expected "drizzle.type <module>::<Type>", got "mod::string[]". "string[]" imports nothing from "mod". For an inline type, use `drizzle.custom { "$type": "string[]" }`.'
		)
	})
})

describe('createField inline $type', () => {
	it('emits the inline type literal verbatim without imports', () => {
		const inline = '{ month: string, min: number, max: number }[]'
		const result = createField({
			field: {
				name: 'data',
				documentation: `drizzle.custom {"$type": ${JSON.stringify(inline)}}`,
				isId: false,
				isRequired: false,
				hasDefaultValue: false,
			} as SchemaField,
			func: 'json()',
		})
		expect(result.func).toBe(`json().$type<${inline}>()`)
		expect(result.imports).toEqual([])
	})
})

describe('getCustomDefault', () => {
	it('reads drizzle.default after a doc line', () => {
		const result = getCustomDefault(
			fieldWithDocs('Some description\ndrizzle.default nanoid::nanoid')
		)
		expect(result?.code).toBe('.$defaultFn(() => nanoid())')
	})
})
