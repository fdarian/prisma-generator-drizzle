import { describe, expect, test } from 'bun:test'
import type { GeneratorOptions } from '@prisma/generator-helper'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { initializeGenerator } from '~/shared/generator-context'
import { createMappedField } from './mapped-field-fixture'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

// The adapter reads the generator context while its module loads, so it must be imported after initialization
async function loadPostgresAdapter() {
	const postgres = await import('./postgres')
	return postgres.postgresAdapter
}

async function createJson(field: SchemaField) {
	const postgresAdapter = await loadPostgresAdapter()
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
	test('applies the type after .array() on a list field', async () => {
		const result = await createJson(
			jsonField('drizzle.type mod::Settings[]', true)
		)
		expect(result.func).toBe(
			"jsonb('history').array().$type<Settings[]>().notNull()"
		)
	})

	test('types a non-list field', async () => {
		const result = await createJson(
			jsonField('drizzle.type mod::Settings', false)
		)
		expect(result.func).toBe("jsonb('history').$type<Settings>().notNull()")
	})
})

describe('postgres table declaration', () => {
	const fields = [
		{
			field: { name: 'id' },
			func: "text('id')",
		},
	] as Parameters<
		Awaited<
			ReturnType<typeof loadPostgresAdapter>
		>['getDeclarationFunc']['table']
	>[1]

	test.each([null, 'public'])('uses pgTable for schema %s', async (schema) => {
		const postgresAdapter = await loadPostgresAdapter()
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

	test('attaches the table to its schema variable', async () => {
		const postgresAdapter = await loadPostgresAdapter()
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
	test.each([null, 'public'])('uses pgEnum for schema %s', async (schema) => {
		const postgresAdapter = await loadPostgresAdapter()
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

	test('attaches the enum to its schema variable', async () => {
		const postgresAdapter = await loadPostgresAdapter()
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
			getDbName: () => 'ids',
			documentation,
			isId: false,
			isList: true,
			isRequired: true,
			hasDefaultValue: false,
		} as unknown as SchemaField
	}

	async function createBigInt(field: SchemaField) {
		const postgresAdapter = await loadPostgresAdapter()
		const bigInt = postgresAdapter.fields.BigInt
		if (bigInt == null) throw new Error('postgres adapter has no BigInt field')
		return bigInt(field)
	}

	test('appends .array() to a BigInt list', async () => {
		const result = await createBigInt(bigIntField())
		expect(result.func).toBe(
			"bigint('ids', { mode: 'bigint' }).array().notNull()"
		)
	})

	test('honors the field mode on a BigInt list', async () => {
		const field = bigIntField(
			'drizzle.custom { "field": { "mode": "number" } }'
		)
		const result = await createBigInt(field)
		expect(result.func).toBe(
			"bigint('ids', { mode: 'number' }).array().notNull()"
		)
	})
})

describe('postgres @map on a field', () => {
	test('names an Int column after the mapped db name', async () => {
		const postgresAdapter = await loadPostgresAdapter()
		const result = postgresAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int' })
		)
		expect(result.func).toBe("integer('successor_id').notNull()")
		expect(result.name).toBe('successorId')
	})

	test('names a String column after the mapped db name', async () => {
		const postgresAdapter = await loadPostgresAdapter()
		const result = postgresAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'String' })
		)
		expect(result.func).toBe("text('successor_id').notNull()")
	})

	test('names an enum column after the mapped db name', async () => {
		const postgresAdapter = await loadPostgresAdapter()
		const result = postgresAdapter.parseField(
			createMappedField({ kind: 'enum', type: 'MappedFieldStatus' })
		)
		expect(result.func).toBe("mappedFieldStatusEnum('successor_id').notNull()")
	})

	test('falls back to the field name without @map', async () => {
		const postgresAdapter = await loadPostgresAdapter()
		const result = postgresAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int', dbName: null })
		)
		expect(result.func).toBe("integer('successorId').notNull()")
	})
})
