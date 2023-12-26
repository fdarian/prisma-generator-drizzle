import { DMMF } from '@prisma/generator-helper'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { createDef } from '../../definitions/createDef'
import { constDeclaration } from '../../definitions/types/constDeclaration'
import { getEnumVarName } from '../../prisma-helpers/enums'
import { Adapter } from '../types'

export function generateEnumDeclaration(
  adapter: Adapter,
  prismaEnum: DMMF.DatamodelEnum
) {
  const varName = getEnumVarName(prismaEnum)

  const enumFuncCall = adapter.getDeclarationFunc.enum(
    getDbName(prismaEnum),
    prismaEnum.values.map(getDbName)
  )

  return createDef({
    imports: enumFuncCall.imports,
    render: constDeclaration(varName, enumFuncCall, { export: true }),
  })
}
