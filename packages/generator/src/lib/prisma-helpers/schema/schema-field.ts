import type { Field } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import type { SchemaModel } from './schema-model'

export type SchemaField = ReturnType<typeof createSchemaField>

export function createSchemaField(args: {
	model: SchemaModel
	dmmfField: DMMF.Field
	astField?: Field
}) {
	const { model, dmmfField } = args

	const field = {
		model,
		isRelationField: undefined as false | undefined,
		name: dmmfField.name,
		isList: dmmfField.isList,
		...(() => {
			if (dmmfField.default != null) {
				return {
					default: dmmfField.default,
					hasDefaultValue: true,
				} as const
			}
			return {
				hasDefaultValue: false,
			} as const
		})(),
		kind: dmmfField.kind,
		type: dmmfField.type,
		documentation: dmmfField.documentation,
		isId: dmmfField.isId,
		isRequired: dmmfField.isRequired,
		isUpdatedAt: dmmfField.isUpdatedAt,
		getDbName() {
			return dmmfField?.dbName ?? dmmfField?.name
		},
	} as const

	if (
		field.kind === 'object' &&
		dmmfField.relationFromFields != null &&
		dmmfField.relationToFields != null
	) {
		return {
			...field,
			kind: field.kind,
			isRelationField: true,
			relationName: dmmfField.relationName,
			relationFromFields: dmmfField.relationFromFields,
			relationToFields: dmmfField.relationToFields,
		} as const
	}

	return field
}

export type SchemaFieldWithDefault = Extract<
	SchemaField,
	{ hasDefaultValue: true }
>

export type SchemaFieldRelational = Extract<
	SchemaField,
	{ isRelationField: true }
>

export function findCorrespondingAstField(
	model: SchemaModel,
	dmmfField: DMMF.Field
) {
	if (model.ast == null)
		throw new Error(`Model ${model.dmmf.name} has no corresponding ast model`)

	const astField = model.ast.properties.find(
		(prop) => prop.type === 'field' && prop.name === dmmfField.name
	)
	if (astField?.type !== 'field') {
		throw new Error(`Ast field ${dmmfField.name} not found`)
	}
	return astField
}
