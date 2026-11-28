import { describe, expect, it } from 'vitest'
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
			name: { type: 'named-import' as const, names: ['Foo'] },
			module: './foo',
			type: true,
		},
	],
	$type: 'Foo',
}

describe('getCustomDirective', () => {
	it('returns undefined without documentation', () => {
		expect(getCustomDirective(fieldWithDocs(undefined))).toBeUndefined()
	})

	it('returns undefined without the directive', () => {
		expect(getCustomDirective(fieldWithDocs('just a doc'))).toBeUndefined()
	})

	it('parses a single-line directive', () => {
		expect(
			getCustomDirective(fieldWithDocs('drizzle.custom {"$type": "Foo"}'))
		).toEqual({ $type: 'Foo' })
	})

	it('parses a multi-line block', () => {
		expect(getCustomDirective(fieldWithDocs(block))).toEqual(expected)
	})

	it('ignores a doc line after the block', () => {
		expect(
			getCustomDirective(fieldWithDocs(`${block}\nTrailing description`))
		).toEqual(expected)
	})

	it('ignores a doc line before the block', () => {
		expect(
			getCustomDirective(fieldWithDocs(`Leading description\n${block}`))
		).toEqual(expected)
	})

	it('ignores doc lines around the block', () => {
		expect(
			getCustomDirective(
				fieldWithDocs(`Leading description\n${block}\nTrailing description`)
			)
		).toEqual(expected)
	})

	it('parses a directive with the brace on the next line', () => {
		expect(
			getCustomDirective(
				fieldWithDocs('drizzle.custom\n{"$type": "Foo"}\nTrailing description')
			)
		).toEqual({ $type: 'Foo' })
	})

	it('ignores prose starting with the directive name', () => {
		expect(
			getCustomDirective(fieldWithDocs('drizzle.custom is not used here'))
		).toBeUndefined()
	})

	it('ignores a longer directive name', () => {
		expect(
			getCustomDirective(fieldWithDocs('drizzle.customType foo'))
		).toBeUndefined()
	})

	it('throws on an unclosed block followed by doc lines', () => {
		expect(() =>
			getCustomDirective(
				fieldWithDocs('drizzle.custom {\n"$type": "Foo"\nTrailing description')
			)
		).toThrow('Invalid drizzle.custom JSON shape on field "data"')
	})

	it('throws on invalid JSON', () => {
		expect(() =>
			getCustomDirective(fieldWithDocs('drizzle.custom {not json'))
		).toThrow('Invalid drizzle.custom JSON shape')
	})

	it('names the field when the shape is invalid', () => {
		expect(() =>
			getCustomDirective(fieldWithDocs('drizzle.custom {"$type": 1}'))
		).toThrow('"data"')
	})

	it('shows only the parsed lines when the shape is invalid', () => {
		expect(() =>
			getCustomDirective(
				fieldWithDocs('drizzle.custom {\n"$type": 1\n}\nTrailing description')
			)
		).toThrow(/"\$type": 1\n\}\n—/)
	})

	it('hints at trailing commas', () => {
		const run = () =>
			getCustomDirective(
				fieldWithDocs(
					'drizzle.custom {\n  "$type": "{ month: string, min: number, max: number }[]",\n}'
				)
			)
		expect(run).toThrow('field "data"')
		expect(run).toThrow(
			'Trailing commas are not allowed in drizzle.custom JSON'
		)
	})

	it('does not hint at trailing commas when there are none', () => {
		expect(() =>
			getCustomDirective(fieldWithDocs('drizzle.custom {"$type": }'))
		).not.toThrow('Trailing commas')
	})
})
