import { describe, expect, it, vi } from 'vitest'
import { mysqlAdapter } from '../providers/mysql'
import { postgresAdapter } from '../providers/postgres'
import type { EnumModule } from './enums'
import type { ModelModule } from './model'
import { generateSchemasModule } from './schemas'

vi.mock('~/shared/generator-context', () => ({
	getModuleResolution: () => undefined,
}))

function enumIn(dbSchema: string | null) {
	return { dbSchema } as EnumModule
}

function modelIn(schema: string | null, name = 'model') {
	return { name, model: { getSchema: () => schema } } as ModelModule
}

describe('generateSchemasModule', () => {
	it('collects schemas from enums, models and implicit join tables', () => {
		const module = generateSchemasModule(postgresAdapter, {
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

	it('emits nothing without @@schema', () => {
		expect(
			generateSchemasModule(postgresAdapter, {
				enums: [enumIn(null)],
				models: [modelIn(null), modelIn('public')],
			})
		).toBe(undefined)
	})

	it('emits nothing for adapters without schema support', () => {
		expect(
			generateSchemasModule(mysqlAdapter, {
				enums: [],
				models: [modelIn('auth')],
			})
		).toBe(undefined)
	})

	it('throws when a model module would overwrite the schemas module', () => {
		expect(() =>
			generateSchemasModule(postgresAdapter, {
				enums: [],
				models: [modelIn('auth'), modelIn(null, 'pg-schemas')],
			})
		).toThrow('same name as the generated "pg-schemas" module')
	})

	it('throws when an implicit model module would overwrite the schemas module', () => {
		expect(() =>
			generateSchemasModule(postgresAdapter, {
				enums: [],
				models: [modelIn('auth')],
				implicitModels: [modelIn(null, 'pg-schemas')],
			})
		).toThrow('same name as the generated "pg-schemas" module')
	})
})
