import type { Adapter } from '../types'
import type { EnumModule } from './enums'
import type { ModelModule } from './model'

export function generateSchemasModule(
	adapter: Adapter,
	modules: {
		enums: EnumModule[]
		models: ModelModule[]
		implicitModels?: ModelModule[]
	}
) {
	if (adapter.createSchemasModule == null) return undefined

	const schemas = [
		...modules.enums.map((m) => m.dbSchema),
		...[...modules.models, ...(modules.implicitModels ?? [])].map((m) =>
			m.model.getSchema()
		),
	].filter((schema): schema is string => schema != null)

	return adapter.createSchemasModule(schemas)
}
