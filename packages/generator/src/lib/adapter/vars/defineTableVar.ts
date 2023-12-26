import { DMMF } from '@prisma/generator-helper'
import { createValue } from '../../value/createValue'
import { pipe } from 'fp-ts/lib/function'
import { Adapter } from '../adapter'
import { or } from 'fp-ts/lib/Refinement'
import { namedImport } from '../../value/types/import'
import { constDeclaration } from '../../value/types/constDeclaration'
import { isKind, getField, getModelVarName } from '../../../generator'
import { v } from 'src/lib/value'

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
