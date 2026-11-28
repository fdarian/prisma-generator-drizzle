import { describe, expect, test } from 'bun:test'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { initializeGenerator } from '~/shared/generator-context'
import { createMappedField } from './mapped-field-fixture'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

// The adapter reads the generator context while its module loads, so it must be imported after initialization
async function loadSqliteAdapter() {
	const sqlite = await import('./sqlite')
	return sqlite.sqliteAdapter
}

// Prisma has no enums on SQLite, so there is no enum column to cover
describe('sqlite @map on a field', () => {
	test('names an Int column after the mapped db name', async () => {
		const sqliteAdapter = await loadSqliteAdapter()
		const result = sqliteAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int' })
		)
		expect(result.func).toBe(
			"integer('successor_id', { mode: 'number' }).notNull()"
		)
		expect(result.name).toBe('successorId')
	})

	test('names a String column after the mapped db name', async () => {
		const sqliteAdapter = await loadSqliteAdapter()
		const result = sqliteAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'String' })
		)
		expect(result.func).toBe("text('successor_id').notNull()")
	})

	test('falls back to the field name without @map', async () => {
		const sqliteAdapter = await loadSqliteAdapter()
		const result = sqliteAdapter.parseField(
			createMappedField({ kind: 'scalar', type: 'Int', dbName: null })
		)
		expect(result.func).toBe(
			"integer('successorId', { mode: 'number' }).notNull()"
		)
	})
})
