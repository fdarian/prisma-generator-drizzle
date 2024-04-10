import type { DMMF } from '@prisma/generator-helper'
import { isEmpty } from 'lodash'
import { deduplicateModels } from '~/generator'
import { isRelationField } from '~/lib/prisma-helpers/field'
import { type Module, createModule } from '~/lib/syntaxes/module'
import { getGenerator } from '~/shared/generator-context'
import { generateSchemaDeclaration } from '../declarations/generateSchemaDeclaration'
import { generateTableRelationsDeclaration } from '../declarations/generateTableRelationsDeclaration'
import type { Adapter } from '../types'
import { type ModelModule, createModelModule } from './model'
import type { BaseGeneratedModules } from './sets/base-generated-modules'

export type RelationalModuleSet = {
	relational: RelationalModule[]
	implicitModels: ModelModule[]
	implicitRelational: Module[]
}

export function generateRelationalModules(modelModules: ModelModule[]) {
	return modelModules.flatMap((modelModule) => {
		const relationalModule = createRelationalModule(modelModule)
		if (relationalModule == null) return []
		return relationalModule
	})
}

export function createRelationalModule(modelModule: ModelModule) {
	const { model } = modelModule

	const relationalFields = model.fields.filter(isRelationField)
	if (isEmpty(relationalFields)) return undefined

	const declaration = generateTableRelationsDeclaration({
		fields: relationalFields,
		modelModule: modelModule,
		datamodel: getGenerator().dmmf.datamodel,
	})
	return createModule({
		name: `${modelModule.name}-relations`,
		declarations: [declaration],
		implicit: declaration.implicit,
	})
}

export type RelationalModule = NonNullable<
	ReturnType<typeof createRelationalModule>
>

export function generateImplicitModules(
	adapter: Adapter,
	relationalModules: RelationalModule[]
) {
	const models = relationalModules
		.flatMap((module) => module.implicit)
		.reduce(deduplicateModels, [] as DMMF.Model[])
		.map(createModelModule(adapter))

	const relational = models.flatMap((modelModule) => {
		const relationalModule = createRelationalModule(modelModule)
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
			generateSchemaDeclaration([
				...modules.models,
				...modules.relational,
				...modules.implicitModels,
				...modules.implicitRelational,
			]),
		],
	})
}
