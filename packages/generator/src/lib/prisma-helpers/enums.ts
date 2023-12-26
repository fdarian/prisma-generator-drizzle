import { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase } from 'lodash'

export function getEnumVarName(prismaEnum: DMMF.DatamodelEnum) {
  return `${camelCase(prismaEnum.name)}Enum`
}

export function getEnumModuleName(prismaEnum: DMMF.DatamodelEnum) {
  return kebabCase(getEnumVarName(prismaEnum))
}
