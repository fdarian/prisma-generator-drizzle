import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import {
	type SchemaModel,
	createSchemaModel,
	findCorrespondingAstModel,
} from '~/lib/prisma-helpers/schema/schema-model'
import { createModule } from '../../syntaxes/module'
import { generateTableDeclaration } from '../declarations/generateTableDeclaration'
import type { Adapter } from '../types'

export function generateModelModules(adapter: Adapter, schema: Schema) {
	return schema.dmmf.datamodel.models.map((dmmfModel) => {
		return createModelModule(
			adapter,
			createSchemaModel({
				dmmfModel,
				astModel: findCorrespondingAstModel(schema.ast, dmmfModel),
			})
		)
	})
}

export function createModelModule(adapter: Adapter, model: SchemaModel) {
	const tableVar = generateTableDeclaration(adapter, model)

	return createModule({
		name: model.getModuleName(),
		model: model,
		tableVar,
		declarations: [tableVar],
	})
}
export type ModelModule = ReturnType<typeof createModelModule>
