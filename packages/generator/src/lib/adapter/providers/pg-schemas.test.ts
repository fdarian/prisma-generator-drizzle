import { afterEach, describe, expect, test } from 'bun:test'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { initializeGenerator } from '~/shared/generator-context'
import {
	createPgSchemasModule,
	getNonPublicSchemas,
	getPgSchemaImport,
	getPgSchemaVarName,
	isPublicSchema,
} from './pg-schemas'

function initGenerator(config: Record<string, string>) {
	initializeGenerator({
		generator: { config, output: { value: 'drizzle.ts' } },
		dmmf: {},
	} as unknown as GeneratorOptions)
}

afterEach(() => {
	initGenerator({})
})

describe('isPublicSchema', () => {
	test.each([
		[null, true],
		['public', true],
		['auth', false],
		['Public', false],
	])('%s -> %s', (schema, expected) => {
		expect(isPublicSchema(schema)).toBe(expected)
	})
})

describe('getPgSchemaVarName', () => {
	test.each([
		['auth', 'authSchema'],
		['user_data', 'userDataSchema'],
		['my-app', 'myAppSchema'],
	])('names %s as %s', (schema, expected) => {
		expect(getPgSchemaVarName(schema)).toBe(expected)
	})
})

describe('getNonPublicSchemas', () => {
	test('drops public, dedupes and sorts', () => {
		expect(
			getNonPublicSchemas(['blog', 'public', 'auth', 'blog', 'auth'])
		).toEqual(['auth', 'blog'])
	})

	test('throws when two schemas share a variable name', () => {
		expect(() => getNonPublicSchemas(['my_app', 'my-app'])).toThrow(
			'both map to the variable "myAppSchema"'
		)
	})

	test('throws when the variable name is not a valid identifier', () => {
		expect(() => getNonPublicSchemas(['1st'])).toThrow(
			'does not start with a letter'
		)
	})

	test('throws when the variable name clashes with the pgSchema import', () => {
		expect(() => getNonPublicSchemas(['pg'])).toThrow(
			'clashes with the pgSchema import'
		)
	})
})

describe('createPgSchemasModule', () => {
	test('is undefined when only public schemas are used', () => {
		expect(createPgSchemasModule('drizzle-orm/pg-core', ['public'])).toBe(
			undefined
		)
		expect(createPgSchemasModule('drizzle-orm/pg-core', [])).toBe(undefined)
	})

	test('declares each used schema once, sorted by name', () => {
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
})

describe('getPgSchemaImport', () => {
	test('imports relative modules with .js under nodenext', () => {
		initGenerator({ moduleResolution: 'nodenext' })
		const result = getPgSchemaImport('auth')
		expect(result.render()).toBe(
			"import { authSchema } from './pg-schemas.js';"
		)
	})
})
