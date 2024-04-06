import type { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import type { Context } from '../../context'
import { getModelModuleName } from '../../prisma-helpers/model'
import { createModule } from '../../syntaxes/module'
import { generateTableDeclaration } from '../declarations/generateTableDeclaration'

export function generateModelModules(options: GeneratorOptions, ctx: Context) {
	return options.dmmf.datamodel.models.map(createModelModule(ctx))
}

export function createModelModule(ctx: Context) {
	return (model: DMMF.Model) => {
		const tableVar = generateTableDeclaration(ctx.adapter, model)

		return createModule({
			name: getModelModuleName(model),
			model: model,
			tableVar,
			declarations: [tableVar],
		})
	}
}
export type ModelModule = ReturnType<ReturnType<typeof createModelModule>>
