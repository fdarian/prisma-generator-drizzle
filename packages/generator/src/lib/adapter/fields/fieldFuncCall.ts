import { DMMF } from '@prisma/generator-helper'
import { Definition } from '~/lib/definitions/createDef'
import { funcCall as func } from '~/lib/definitions/types/funcCall'
import { object } from '~/lib/definitions/types/object'
import { string } from '~/lib/definitions/types/string'

export function fieldFuncCall(
  funcName: string,
  field: DMMF.Field,
  opts?: Record<string, Definition>
) {
  return func(funcName, [
    string(field.dbName ?? field.name),
    ...(opts ? [object(opts)] : []),
  ])
}
