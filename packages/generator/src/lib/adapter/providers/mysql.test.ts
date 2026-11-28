import { describe, expect, test } from 'bun:test'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { initializeGenerator } from '~/shared/generator-context'
import { createMappedField } from './mapped-field-fixture'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

// The adapter reads the generator context while its module loads, so it must be imported after initialization
async function loadMysqlAdapter() {
	const mysql = await import('./mysql')
	return mysql.mysqlAdapter
}

describe('mysql @map on a field', () => {
	test('names an Int column after the mapped db name', async () => {
		const mysqlAdapter = await loadMysqlAdapter()
		const result = mysqlAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int' })
		)
		expect(result.func).toBe("int('successor_id').notNull()")
		expect(result.name).toBe('successorId')
	})

	test('names a Boolean column after the mapped db name', async () => {
		const mysqlAdapter = await loadMysqlAdapter()
		const result = mysqlAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Boolean' })
		)
		expect(result.func).toBe("boolean('successor_id').notNull()")
	})

	test('names an enum column after the mapped db name', async () => {
		const mysqlAdapter = await loadMysqlAdapter()
		const result = mysqlAdapter.parseField(
			createMappedField({ kind: 'enum', type: 'MappedFieldStatus' })
		)
		expect(result.func).toBe("mappedFieldStatusEnum('successor_id').notNull()")
	})

	test('falls back to the field name without @map', async () => {
		const mysqlAdapter = await loadMysqlAdapter()
		const result = mysqlAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int', dbName: null })
		)
		expect(result.func).toBe("int('successorId').notNull()")
	})
})
