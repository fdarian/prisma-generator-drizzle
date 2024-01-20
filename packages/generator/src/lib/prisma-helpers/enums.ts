import { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase, memoize } from 'lodash'

export const getEnumVarName = memoize((prismaEnum: DMMF.DatamodelEnum) => {
	return `${camelCase(prismaEnum.name)}Enum`
})

export const getEnumModuleName = memoize((prismaEnum: DMMF.DatamodelEnum) => {
	return kebabCase(getEnumVarName(prismaEnum))
})
