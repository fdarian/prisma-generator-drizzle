import type { Context } from '../../context'
import { isEmpty } from 'lodash'
import { isRelationField } from '~/lib/prisma-helpers/field'
import { createModule } from '~/lib/syntaxes/module'
import { generateTableRelationsDeclaration } from '../declarations/generateTableRelationsDeclaration'
import type { ModelModule } from './model'
import type { BaseGeneratedModules } from './sets/base-generated-modules'

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

export type RelationalModule = NonNullable<ReturnType<typeof createRelationalModule>>
