import type { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase, memoize } from 'lodash'
import { getGenerator } from '~/shared/generator-context'
import { getDbName } from './getDbName'

export const getEnumVarName = memoize((prismaEnum: DMMF.DatamodelEnum) => {
	return `${camelCase(prismaEnum.name)}Enum`
})

export const getEnumModuleName = memoize((prismaEnum: DMMF.DatamodelEnum) => {
	return kebabCase(getEnumVarName(prismaEnum))
})

export function getEnumMemberDbName(enumName: string, memberName: string) {
	const prismaEnum = getGenerator().dmmf.datamodel.enums.find(
		(e) => e.name === enumName
	)
	if (prismaEnum == null) throw new Error(`Enum ${enumName} not found`)

	const member = prismaEnum.values.find((v) => v.name === memberName)
	if (member == null)
		throw new Error(`Enum ${enumName} has no member ${memberName}`)

	return getDbName(member)
}
