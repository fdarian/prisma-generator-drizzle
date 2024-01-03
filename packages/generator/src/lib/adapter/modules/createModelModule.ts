import { DMMF } from '@prisma/generator-helper'
import { Context } from '../../context'
import { getModelModuleName } from '../../prisma-helpers/model'
import { createModule } from '../../syntaxes/module'
import { generateTableDeclaration } from '../declarations/generateTableDeclaration'

export function createModelModule(input: { model: DMMF.Model; ctx: Context }) {
  const tableVar = generateTableDeclaration(input.ctx.adapter, input.model)

  return createModule({
    name: getModelModuleName(input.model),
    model: input.model,
    tableVar,
    declarations: [tableVar],
  })
}
export type ModelModule = ReturnType<typeof createModelModule>
