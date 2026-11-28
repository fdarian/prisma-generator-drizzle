import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	createPgSchemasModule,
	getNonPublicSchemas,
	getPgSchemaImport,
	getPgSchemaVarName,
	isPublicSchema,
} from './pg-schemas'

const moduleResolution = vi.hoisted(() => ({
	current: undefined as string | undefined,
}))
vi.mock('~/shared/generator-context', () => ({
	getModuleResolution: () => moduleResolution.current,
}))

afterEach(() => {
	moduleResolution.current = undefined
})

describe('isPublicSchema', () => {
	it.each([
		[null, true],
		['public', true],
		['auth', false],
		['Public', false],
	])('%s -> %s', (schema, expected) => {
		expect(isPublicSchema(schema)).toBe(expected)
	})
})

describe('getPgSchemaVarName', () => {
	it.each([
		['auth', 'authSchema'],
		['user_data', 'userDataSchema'],
		['my-app', 'myAppSchema'],
	])('names %s as %s', (schema, expected) => {
		expect(getPgSchemaVarName(schema)).toBe(expected)
	})
})

describe('getNonPublicSchemas', () => {
	it('drops public, dedupes and sorts', () => {
		expect(
			getNonPublicSchemas(['blog', 'public', 'auth', 'blog', 'auth'])
		).toEqual(['auth', 'blog'])
	})

	it('throws when two schemas share a variable name', () => {
		expect(() => getNonPublicSchemas(['my_app', 'my-app'])).toThrow(
			'both map to the variable "myAppSchema"'
		)
	})

	it('throws when the variable name is not a valid identifier', () => {
		expect(() => getNonPublicSchemas(['1st'])).toThrow(
			'does not start with a letter'
		)
	})
})

describe('createPgSchemasModule', () => {
	it('is undefined when only public schemas are used', () => {
		expect(createPgSchemasModule('drizzle-orm/pg-core', ['public'])).toBe(
			undefined
		)
		expect(createPgSchemasModule('drizzle-orm/pg-core', [])).toBe(undefined)
	})

	it('declares each used schema once, sorted by name', () => {
		const module = createPgSchemasModule('drizzle-orm/pg-core', [
			'blog',
			'public',
			'auth',
			'blog',
		])

		expect(module?.name).toBe('pg-schemas')
		expect(module?.code).toBe(
			[
				"import { pgSchema } from 'drizzle-orm/pg-core';",
				"export const authSchema = pgSchema('auth');",
				"export const blogSchema = pgSchema('blog');",
			].join('\n\n')
		)
	})

	it('imports relative modules with .js under nodenext', () => {
		moduleResolution.current = 'nodenext'
		const result = getPgSchemaImport('auth')
		expect(result.render()).toBe(
			"import { authSchema } from './pg-schemas.js';"
		)
	})
})
