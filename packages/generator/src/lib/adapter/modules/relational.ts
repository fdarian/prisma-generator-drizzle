import type { DMMF } from '@prisma/generator-helper'
import { isEmpty } from 'lodash'
import { deduplicateModels } from '~/generator'
import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import {
	createSchemaModel,
	getModelFields,
} from '~/lib/prisma-helpers/schema/schema-model'
import { createModule } from '~/lib/syntaxes/module'
import { getGenerator } from '~/shared/generator-context'
import {
	generateSchemaDeclaration,
	generateSingleFileSchemaDeclaration,
} from '../declarations/generateSchemaDeclaration'
import { generateTableRelationsDeclaration } from '../declarations/generateTableRelationsDeclaration'
import type { Adapter } from '../types'
import { type ModelModule, createModelModule } from './model'
import type { BaseGeneratedModules } from './sets/base-generated-modules'

export type RelationalModuleSet = {
	relational: RelationalModule[]
	implicitModels: ModelModule[]
	implicitRelational: RelationalModule[]
}

export function generateRelationalModules(
	schema: Schema,
	modelModules: ModelModule[]
) {
	return modelModules.flatMap((modelModule) => {
		const relationalModule = createRelationalModule(schema, modelModule)
		if (relationalModule == null) return []
		return relationalModule
	})
}

export function createRelationalModule(
	schema: Schema,
	modelModule: ModelModule
) {
	const { model } = modelModule

	const relationalFields = getModelFields(model).filter(
		(field) => field.isRelationField === true
	)
	if (isEmpty(relationalFields)) return undefined

	const declaration = generateTableRelationsDeclaration({
		fields: relationalFields,
		modelModule: modelModule,
		schema,
	})
	return createModule({
		name: `${modelModule.name}-relations`,
		relationsVar: declaration,
		declarations: [declaration],
		implicit: declaration.implicit,
	})
}

export type RelationalModule = NonNullable<
	ReturnType<typeof createRelationalModule>
>

export function generateImplicitModules(
	adapter: Adapter,
	schema: Schema,
	relationalModules: RelationalModule[]
) {
	const models = relationalModules
		.flatMap((module) => module.implicit)
		.reduce(deduplicateModels, [] as DMMF.Model[])
		.map((dmmfModel) => {
			return createModelModule(adapter, createSchemaModel({ dmmfModel }))
		})

	const relational = models.flatMap((modelModule) => {
		const relationalModule = createRelationalModule(schema, modelModule)
		if (relationalModule == null) return []
		return relationalModule
	})
	return { models, relational }
}

export function generateSchemaModules(
	modules: BaseGeneratedModules & RelationalModuleSet
) {
	return createModule({
		name: 'schema',
		declarations: [
			getGenerator().output.isSingleFile
				? generateSingleFileSchemaDeclaration([
						...[...modules.models, ...modules.implicitModels].map(
							(m) => m.tableVar.name
						),
						...[...modules.relational, ...modules.implicitRelational].map(
							(m) => m.relationsVar.name
						),
					])
				: generateSchemaDeclaration([
						...modules.models,
						...modules.relational,
						...modules.implicitModels,
						...modules.implicitRelational,
					]),
		],
	})
}
