import type { Context } from '../../context'
import { isEmpty } from 'lodash'
import { isRelationField } from '~/lib/prisma-helpers/field'
import { createModule, type Module } from '~/lib/syntaxes/module'
import { generateTableRelationsDeclaration } from '../declarations/generateTableRelationsDeclaration'
import { createModelModule, type ModelModule } from './model'
import type { BaseGeneratedModules } from './sets/base-generated-modules'
import { deduplicateModels } from '~/generator'
import type { DMMF } from '@prisma/generator-helper'
import { generateSchemaDeclaration } from '../declarations/generateSchemaDeclaration'

export type RelationalModuleSet = {
	relational: RelationalModule[]
	implicitModels: ModelModule[]
	implicitRelational: Module[]
}

export function generateRelationalModules(
	modules: BaseGeneratedModules,
	ctx: Context
) {
	return modules.models.flatMap((modelModule) => {
		const relationalModule = createRelationalModule({ ctx, modelModule })
		if (relationalModule == null) return []
		return relationalModule
	})
}

export function createRelationalModule(input: {
	modelModule: ModelModule
	ctx: Context
}) {
	const { model } = input.modelModule

	const relationalFields = model.fields.filter(isRelationField)
	if (isEmpty(relationalFields)) return undefined

	const declaration = generateTableRelationsDeclaration({
		fields: relationalFields,
		modelModule: input.modelModule,
		datamodel: input.ctx.datamodel,
	})
	return createModule({
		name: `${input.modelModule.name}-relations`,
		declarations: [declaration],
		implicit: declaration.implicit,
	})
}

export type RelationalModule = NonNullable<
	ReturnType<typeof createRelationalModule>
>

export function generateImplicitModules(
	relationalModules: RelationalModule[],
	ctx: Context
) {
	const models = relationalModules
		.flatMap((module) => module.implicit)
		.reduce(deduplicateModels, [] as DMMF.Model[])
		.map(createModelModule(ctx))

	const relational = models.flatMap((modelModule) => {
		const relationalModule = createRelationalModule({ ctx, modelModule })
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
