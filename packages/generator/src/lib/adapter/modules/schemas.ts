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

	const modelModules = [...modules.models, ...(modules.implicitModels ?? [])]
	const schemas = [
		...modules.enums.map((m) => m.dbSchema),
		...modelModules.map((m) => m.model.getSchema()),
	].filter((schema): schema is string => schema != null)

	const schemasModule = adapter.createSchemasModule(schemas)
	if (schemasModule == null) return undefined

	const clash = modelModules.find((m) => m.name === schemasModule.name)
	if (clash != null) {
		throw new Error(
			`Model module "${clash.name}" has the same name as the generated "${schemasModule.name}" module and would be overwritten; rename the model`
		)
	}

	return schemasModule
}
