import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import { createSchemaModel } from '~/lib/prisma-helpers/schema/schema-model'
import { createModule } from '~/lib/syntaxes/module'
import { getGenerator } from '~/shared/generator-context'
import { generateRelationsDefinitionDeclaration } from '../declarations/generateRelationsDefinitionDeclaration'
import {
	generateSchemaDeclaration,
	generateSingleFileSchemaDeclaration,
} from '../declarations/generateSchemaDeclaration'
import type { Adapter } from '../types'
import { type ModelModule, createModelModule } from './model'

const RELATIONS_MODULE_NAME = 'relations'

export function generateRelationsDefinitionModules(
	adapter: Adapter,
	schema: Schema,
	modelModules: ModelModule[]
) {
	if (modelModules.some((m) => m.name === RELATIONS_MODULE_NAME)) {
		throw new Error(
			`A model is generated into ${RELATIONS_MODULE_NAME}.ts, which collides with the relations module of relations = "v2"`
		)
	}

	const declaration = generateRelationsDefinitionDeclaration({
		schema,
		modelModules,
	})

	return {
		implicitModels: declaration.implicit.map((dmmfModel) =>
			createModelModule(adapter, schema, createSchemaModel({ dmmfModel }))
		),
		relations: createModule({
			name: RELATIONS_MODULE_NAME,
			declarations: [declaration],
		}),
	}
}

/** Tables only, the relations live in the `relations` module */
export function generateTablesSchemaModule(modules: {
	models: ModelModule[]
	implicitModels: ModelModule[]
}) {
	const tables = [...modules.models, ...modules.implicitModels]

	return createModule({
		name: 'schema',
		declarations: [
			getGenerator().output.isSingleFile
				? generateSingleFileSchemaDeclaration(
						tables.map((m) => m.tableVar.name)
					)
				: generateSchemaDeclaration(tables),
		],
	})
}
