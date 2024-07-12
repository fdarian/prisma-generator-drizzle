import type { DMMF } from '@prisma/generator-helper'
import type { SchemaField } from './schema/schema-field'

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

export function isKind<TKind extends SchemaField['kind']>(kind: TKind) {
	return (
		field: SchemaField
	): field is Extract<SchemaField['kind'], { kind: TKind }> =>
		field.kind === kind
}

export function isRelationField(field: DMMF.Field) {
	return (
		field.kind === 'object' &&
		field.relationFromFields != null &&
		field.relationToFields != null
	)
}
