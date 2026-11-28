import { describe, expect, it, vi } from 'vitest'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { postgresAdapter } from './postgres'

vi.mock('~/shared/generator-context', () => ({
	getModuleResolution: () => undefined,
}))

function createJson(field: SchemaField) {
	const json = postgresAdapter.fields.Json
	if (json == null) throw new Error('postgres adapter has no Json field')
	return json(field)
}

function jsonField(documentation: string, isList: boolean) {
	return {
		name: 'history',
		getDbName: () => 'history',
		documentation,
		isId: false,
		isList,
		isRequired: true,
		hasDefaultValue: false,
	} as unknown as SchemaField
}

describe('postgres Json field with drizzle.type', () => {
	it('applies the type after .array() on a list field', () => {
		const result = createJson(jsonField('drizzle.type mod::Settings[]', true))
		expect(result.func).toBe(
			"jsonb('history').array().$type<Settings[]>().notNull()"
		)
	})

	it('types a non-list field', () => {
		const result = createJson(jsonField('drizzle.type mod::Settings', false))
		expect(result.func).toBe("jsonb('history').$type<Settings>().notNull()")
	})
})

describe('postgres table declaration', () => {
	const fields = [
		{
			field: { name: 'id' },
			func: "text('id')",
		},
	] as Parameters<typeof postgresAdapter.getDeclarationFunc.table>[1]

	it.each([null, 'public'])('uses pgTable for schema %s', (schema) => {
		const result = postgresAdapter.getDeclarationFunc.table(
			'User',
			fields,
			schema,
			[]
		)

		expect(result.func).toBe("pgTable('User', { id: text('id') })")
		expect(result.imports.map((i) => i.render())).toEqual([
			"import { pgTable } from 'drizzle-orm/pg-core';",
		])
	})

	it('attaches the table to its schema variable', () => {
		const result = postgresAdapter.getDeclarationFunc.table(
			'User',
			fields,
			'auth',
			[]
		)

		expect(result.func).toBe("authSchema.table('User', { id: text('id') })")
		expect(result.imports.map((i) => i.render())).toEqual([
			"import { authSchema } from './pg-schemas';",
		])
	})
})

describe('postgres enum declaration', () => {
	it.each([null, 'public'])('uses pgEnum for schema %s', (schema) => {
		const result = postgresAdapter.getDeclarationFunc.enum(
			'Role',
			['A', 'B'],
			schema
		)

		expect(result.func).toBe("pgEnum('Role', ['A', 'B'])")
		expect(result.imports.map((i) => i.render())).toEqual([
			"import { pgEnum } from 'drizzle-orm/pg-core';",
		])
	})

	it('attaches the enum to its schema variable', () => {
		const result = postgresAdapter.getDeclarationFunc.enum(
			'Role',
			['A', 'B'],
			'auth'
		)

		expect(result.func).toBe("authSchema.enum('Role', ['A', 'B'])")
		expect(result.imports.map((i) => i.render())).toEqual([
			"import { authSchema } from './pg-schemas';",
		])
	})
})

describe('postgres list fields', () => {
	function bigIntField(documentation?: string) {
		return {
			name: 'ids',
			dbName: null,
			documentation,
			isId: false,
			isList: true,
			isRequired: true,
			hasDefaultValue: false,
		} as unknown as SchemaField
	}

	function createBigInt(field: SchemaField) {
		const bigInt = postgresAdapter.fields.BigInt
		if (bigInt == null) throw new Error('postgres adapter has no BigInt field')
		return bigInt(field)
	}

	it('appends .array() to a BigInt list', () => {
		expect(createBigInt(bigIntField()).func).toBe(
			"bigint('ids', { mode: 'bigint' }).array().notNull()"
		)
	})

	it('honors the field mode on a BigInt list', () => {
		const field = bigIntField(
			'drizzle.custom { "field": { "mode": "number" } }'
		)
		expect(createBigInt(field).func).toBe(
			"bigint('ids', { mode: 'number' }).array().notNull()"
		)
	})
})
