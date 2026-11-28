import { describe, expect, test } from 'bun:test'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { initializeGenerator } from '~/shared/generator-context'
import type { EnumModule } from './enums'
import type { ModelModule } from './model'

initializeGenerator({
	generator: { config: {}, output: { value: 'drizzle.ts' } },
	dmmf: {},
} as unknown as GeneratorOptions)

// The adapters read the generator context while their modules load, so they must be imported after initialization
async function load() {
	const mysql = await import('../providers/mysql')
	const postgres = await import('../providers/postgres')
	const schemas = await import('./schemas')
	return {
		mysqlAdapter: mysql.mysqlAdapter,
		postgresAdapter: postgres.postgresAdapter,
		generateSchemasModule: schemas.generateSchemasModule,
	}
}

function enumIn(dbSchema: string | null) {
	return { dbSchema } as EnumModule
}

function modelIn(schema: string | null, name = 'model') {
	return { name, model: { getSchema: () => schema } } as ModelModule
}

describe('generateSchemasModule', () => {
	test('collects schemas from enums, models and implicit join tables', async () => {
		const m = await load()
		const module = m.generateSchemasModule(m.postgresAdapter, {
			enums: [enumIn('auth')],
			models: [modelIn('public'), modelIn(null)],
			implicitModels: [modelIn('blog')],
		})

		expect(module?.code).toContain(
			"export const authSchema = pgSchema('auth');"
		)
		expect(module?.code).toContain(
			"export const blogSchema = pgSchema('blog');"
		)
		expect(module?.code).not.toContain('public')
	})

	test('emits nothing without @@schema', async () => {
		const m = await load()
		expect(
			m.generateSchemasModule(m.postgresAdapter, {
				enums: [enumIn(null)],
				models: [modelIn(null), modelIn('public')],
			})
		).toBe(undefined)
	})

	test('emits nothing for adapters without schema support', async () => {
		const m = await load()
		expect(
			m.generateSchemasModule(m.mysqlAdapter, {
				enums: [],
				models: [modelIn('auth')],
			})
		).toBe(undefined)
	})

	test('throws when a model module would overwrite the schemas module', async () => {
		const m = await load()
		expect(() =>
			m.generateSchemasModule(m.postgresAdapter, {
				enums: [],
				models: [modelIn('auth'), modelIn(null, 'pg-schemas')],
			})
		).toThrow('same name as the generated "pg-schemas" module')
	})

	test('throws when an implicit model module would overwrite the schemas module', async () => {
		const m = await load()
		expect(() =>
			m.generateSchemasModule(m.postgresAdapter, {
				enums: [],
				models: [modelIn('auth')],
				implicitModels: [modelIn(null, 'pg-schemas')],
			})
		).toThrow('same name as the generated "pg-schemas" module')
	})
})
