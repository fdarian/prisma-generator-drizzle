import { DMMF } from '@prisma/generator-helper'
import { IValue } from 'src/lib/value/createValue'
import { funcValue as func } from 'src/lib/value/types/funcValue'
import { objectValue as object } from 'src/lib/value/types/objectValue'
import { stringValue as string } from 'src/lib/value/types/stringValue'

export function fieldFunc(
  funcName: string,
  field: DMMF.Field,
  opts?: Record<string, IValue>
) {
  return func(funcName, [
    string(field.dbName ?? field.name),
    ...(opts ? [object(opts)] : []),
  ])
}
