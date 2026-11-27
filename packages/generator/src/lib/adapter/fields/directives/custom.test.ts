import { describe, expect, test } from 'bun:test'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { getCustomDirective } from './custom'

function fieldWithDocs(documentation: string | undefined) {
	return { name: 'data', documentation } as SchemaField
}

const block = [
	'drizzle.custom {',
	'  "imports": [{ "name": ["Foo"], "module": "./foo", "type": true }],',
	'  "$type": "Foo"',
	'}',
].join('\n')

const expected = {
	imports: [
		{
			name: { type: 'named-import', names: ['Foo'] },
			module: './foo',
			type: true,
		},
	],
	$type: 'Foo',
}

describe('getCustomDirective', () => {
	test('returns undefined without documentation', () => {
		expect(getCustomDirective(fieldWithDocs(undefined))).toBeUndefined()
	})

	test('returns undefined without the directive', () => {
		expect(getCustomDirective(fieldWithDocs('just a doc'))).toBeUndefined()
	})

	test('parses a single-line directive', () => {
		expect(
			getCustomDirective(fieldWithDocs('drizzle.custom {"$type": "Foo"}'))
		).toEqual({ $type: 'Foo' })
	})

	test('parses a multi-line block', () => {
		expect(getCustomDirective(fieldWithDocs(block))).toEqual(expected)
	})

	test('ignores a doc line after the block', () => {
		expect(
			getCustomDirective(fieldWithDocs(`${block}\nTrailing description`))
		).toEqual(expected)
	})

	test('ignores a doc line before the block', () => {
		expect(
			getCustomDirective(fieldWithDocs(`Leading description\n${block}`))
		).toEqual(expected)
	})

	test('ignores doc lines around the block', () => {
		expect(
			getCustomDirective(
				fieldWithDocs(`Leading description\n${block}\nTrailing description`)
			)
		).toEqual(expected)
	})

	test('throws on invalid JSON', () => {
		expect(() =>
			getCustomDirective(fieldWithDocs('drizzle.custom {not json'))
		).toThrow('Invalid drizzle.custom JSON shape')
	})

	test('names the field when the shape is invalid', () => {
		expect(() =>
			getCustomDirective(fieldWithDocs('drizzle.custom {"$type": 1}'))
		).toThrow('"data"')
	})
})
