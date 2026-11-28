import type { DMMF } from '@prisma/generator-helper'
import { isEmpty } from 'lodash'
import { getModelModuleName, getModelVarName } from '~/lib/prisma-helpers/model'
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
	const models = collectImplicitJoinModels(
		relationalModules.flatMap((module) => module.implicit)
	).map((dmmfModel) => {
		return createModelModule(
			adapter,
			schema,
			createSchemaModel({ dmmfModel, isImplicitJoinTable: true })
		)
	})

	const relational = models.flatMap((modelModule) => {
		const relationalModule = createRelationalModule(schema, modelModule)
		if (relationalModule == null) return []
		return relationalModule
	})
	return { models, relational }
}

/**
 * Both sides of a relation produce the same join model, which is collected once.
 * Distinct relations whose names normalize to the same model, variable or module name
 * would overwrite each other in the generated output, so they are rejected.
 */
export function collectImplicitJoinModels(joinModels: DMMF.Model[]) {
	const collected: DMMF.Model[] = []
	for (const joinModel of joinModels) {
		const isDuplicate = collected.some(
			(existing) =>
				existing.name === joinModel.name && existing.dbName === joinModel.dbName
		)
		if (isDuplicate) continue

		for (const existing of collected) {
			const collision = findNameCollision(existing, joinModel)
			if (collision != null)
				throw new Error(
					`Implicit many-to-many relations ${existing.dbName} and ${joinModel.dbName} generate the same ${collision}. Rename one of the relations so they differ after normalization.`
				)
		}
		collected.push(joinModel)
	}
	return collected
}

function findNameCollision(a: DMMF.Model, b: DMMF.Model) {
	if (a.name === b.name) return `model name "${a.name}"`
	if (getModelVarName(a) === getModelVarName(b))
		return `variable name "${getModelVarName(a)}"`
	if (getModelModuleName(a) === getModelModuleName(b))
		return `module name "${getModelModuleName(a)}"`
	return null
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
