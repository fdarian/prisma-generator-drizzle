import { DMMF } from '@prisma/generator-helper'

export type PrismaFieldType =
	| 'BigInt'
	| 'Boolean'
	| 'Bytes'
	| 'DateTime'
	| 'Decimal'
	| 'Float'
	| 'Int'
	| 'Json'
	| 'String'
export interface PrismaScalarField extends Omit<DMMF.Field, 'kind' | 'type'> {
	kind: 'scalar'
	type: PrismaFieldType
}
export interface PrismaEnumField extends Omit<DMMF.Field, 'kind'> {
	kind: 'enum'
	// The Enum's name
	type: string
}
export interface PrismaRelationField
	extends Omit<
			DMMF.Field,
			'relationFromFields' | 'relationToFields' | 'relationName' | 'kind'
		>,
		Required<
			Pick<
				DMMF.Field,
				'relationFromFields' | 'relationToFields' | 'relationName'
			>
		> {
	kind: 'object'
}

export interface PrismaObjectField extends Omit<DMMF.Field, 'kind'> {
	kind: 'object'
}
type PrismaField = PrismaScalarField | PrismaEnumField | PrismaObjectField

export function isKind<TKind extends PrismaField['kind']>(kind: TKind) {
	return (field: DMMF.Field): field is Extract<PrismaField, { kind: TKind }> =>
		field.kind === kind
}

export function isRelationField(
	field: DMMF.Field
): field is PrismaRelationField {
	return (
		field.kind === 'object' &&
		field.relationFromFields != null &&
		field.relationToFields != null
	)
}
