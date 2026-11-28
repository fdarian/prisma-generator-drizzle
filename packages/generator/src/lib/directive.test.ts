import { describe, expect, it } from 'vitest'
import { getDirective } from './directive'
import type { SchemaField } from './prisma-helpers/schema/schema-field'

function fieldWithDocs(documentation: string | undefined) {
	return { name: 'data', documentation } as SchemaField
}

describe('getDirective', () => {
	it('returns undefined without documentation', () => {
		expect(
			getDirective(fieldWithDocs(undefined), 'drizzle.type')
		).toBeUndefined()
	})

	it('returns undefined when no line has the directive', () => {
		expect(
			getDirective(fieldWithDocs('just a doc'), 'drizzle.type')
		).toBeUndefined()
	})

	it('reads a directive on its own', () => {
		expect(
			getDirective(fieldWithDocs('drizzle.type viem::Address'), 'drizzle.type')
		).toBe('viem::Address')
	})

	it('reads a directive after a doc line', () => {
		expect(
			getDirective(
				fieldWithDocs('Some description\ndrizzle.type viem::Address'),
				'drizzle.type'
			)
		).toBe('viem::Address')
	})

	it('reads a directive before a doc line', () => {
		expect(
			getDirective(
				fieldWithDocs('drizzle.type viem::Address\nSome description'),
				'drizzle.type'
			)
		).toBe('viem::Address')
	})

	it('reads an indented directive', () => {
		expect(
			getDirective(
				fieldWithDocs('Some description\n  drizzle.type viem::Address'),
				'drizzle.type'
			)
		).toBe('viem::Address')
	})

	it('does not match a longer directive name', () => {
		expect(
			getDirective(fieldWithDocs('drizzle.typeX viem::Address'), 'drizzle.type')
		).toBeUndefined()
	})

	it('returns an empty value for a bare directive', () => {
		expect(getDirective(fieldWithDocs('drizzle.type'), 'drizzle.type')).toBe('')
	})
})
