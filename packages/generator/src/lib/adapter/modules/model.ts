import type { DMMF } from '@prisma/generator-helper'
import { getModelModuleName } from '../../prisma-helpers/model'
import { createModule } from '../../syntaxes/module'
import { generateTableDeclaration } from '../declarations/generateTableDeclaration'
import { getGenerator } from '~/shared/generator-context'
import type { Adapter } from '../types'

export function generateModelModules(adapter: Adapter) {
	return getGenerator().dmmf.datamodel.models.map(createModelModule(adapter))
}

export function createModelModule(adapter: Adapter) {
	return (model: DMMF.Model) => {
		const tableVar = generateTableDeclaration(adapter, model)

		return createModule({
			name: getModelModuleName(model),
			model: model,
			tableVar,
			declarations: [tableVar],
		})
	}
}
export type ModelModule = ReturnType<ReturnType<typeof createModelModule>>
