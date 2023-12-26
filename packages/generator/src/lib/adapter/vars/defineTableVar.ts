import { DMMF } from '@prisma/generator-helper'
import { or } from 'fp-ts/lib/Refinement'
import { pipe } from 'fp-ts/lib/function'
import { v } from 'src/lib/value'
import { getField, getModelVarName, isKind } from '../../../generator'
import { createValue } from '../../value/createValue'
import { constDeclaration } from '../../value/types/constDeclaration'
import { namedImport } from '../../value/types/import'
import { Adapter } from '../adapter'

export function defineTableVar(adapter: Adapter, model: DMMF.Model) {
  const fields = model.fields
    .filter(pipe(isKind('scalar'), or(isKind('enum'))))
    .map(getField(adapter))
  const name = getModelVarName(model)

  return createValue({
    name,
    imports: [
      namedImport([adapter.functions.table], adapter.module),
      ...fields.flatMap((field) => field.imports),
    ],
    render: constDeclaration(
      name,
      v.func(adapter.functions.table, [
        v.string(model.name),
        v.object(fields.map((field) => [field.field, field])),
      ]),
      { export: true }
    ),
  })
}
