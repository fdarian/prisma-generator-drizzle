import type { Schema as AstSchema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'

/**
 * DMMF enums carry no schema, so `@@schema` has to be read from the ast.
 */
export function findEnumSchema(
	astSchema: AstSchema,
	prismaEnum: DMMF.DatamodelEnum
) {
	const astEnum = astSchema.list.find(
		(block) => block.type === 'enum' && block.name === prismaEnum.name
	)
	if (astEnum?.type !== 'enum')
		throw new Error(`Cannot find corresponding ast enum for ${prismaEnum.name}`)

	const attribute = astEnum.enumerators.find(
		(item) =>
			item.type === 'attribute' &&
			item.kind === 'object' &&
			item.name === 'schema'
	)
	if (attribute == null || attribute.type !== 'attribute') return null

	const value = attribute.args?.[0]?.value
	if (typeof value !== 'string' || !/^".*"$/.test(value)) {
		throw new Error(
			`Invalid @@schema on enum ${prismaEnum.name}: expected a string literal`
		)
	}
	return value.slice(1, -1)
}
