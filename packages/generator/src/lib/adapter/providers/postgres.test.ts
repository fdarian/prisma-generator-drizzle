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
		dbName: null,
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
