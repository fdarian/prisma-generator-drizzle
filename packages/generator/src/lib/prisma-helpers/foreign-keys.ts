import type { Attribute, KeyValue } from '@mrleebo/prisma-ast'
import { getModelModuleName, getModelVarName } from './model'
import type { Schema } from './schema/schema'
import { getModelFields } from './schema/schema-model'
import type { SchemaModel } from './schema/schema-model'

export type ForeignKeyAction =
	| 'cascade'
	| 'restrict'
	| 'no action'
	| 'set null'
	| 'set default'

export type ForeignKey = {
	/** Only set with `@relation(map: "...")` */
	name: string | undefined
	/** Field names (TS keys) of the model owning the foreign key */
	columns: string[]
	target: {
		isSelf: boolean
		varName: string
		moduleName: string
		/** Field names (TS keys) of the referenced model */
		columns: string[]
	}
	onDelete: ForeignKeyAction
	onUpdate: ForeignKeyAction
}

const ACTIONS: Record<string, ForeignKeyAction> = {
	Cascade: 'cascade',
	Restrict: 'restrict',
	NoAction: 'no action',
	SetNull: 'set null',
	SetDefault: 'set default',
}

function parseAction(value: string): ForeignKeyAction {
	const action = ACTIONS[value]
	if (action == null) throw new Error(`Unknown referential action ${value}`)
	return action
}

export function getForeignKeys(
	schema: Schema,
	model: SchemaModel
): ForeignKey[] {
	if (usesPrismaRelationMode(schema)) return []

	return getModelFields(model).flatMap((field) => {
		if (field.isRelationField !== true) return []
		if (field.relationFromFields.length === 0) return []
		if (field.relationToFields.length === 0) return []

		const targetModel = schema.dmmf.datamodel.models.find(
			(m) => m.name === field.type
		)
		if (targetModel == null) return []

		const localFields = field.relationFromFields.flatMap((name) =>
			model.dmmf.fields.filter((f) => f.name === name)
		)
		if (localFields.length !== field.relationFromFields.length) return []

		const targetFields = field.relationToFields.flatMap((name) =>
			targetModel.fields.filter((f) => f.name === name)
		)
		if (targetFields.length !== field.relationToFields.length) return []

		const isRequired = field.isRequired || localFields.some((f) => f.isRequired)

		return {
			name: findExplicitName(model, field.name),
			columns: [...field.relationFromFields],
			target: {
				isSelf: targetModel.name === model.dmmf.name,
				varName: getModelVarName(targetModel),
				moduleName: getModelModuleName(targetModel),
				columns: [...field.relationToFields],
			},
			onDelete:
				field.relationOnDelete != null
					? parseAction(field.relationOnDelete)
					: isRequired
						? 'restrict'
						: 'set null',
			onUpdate:
				field.relationOnUpdate != null
					? parseAction(field.relationOnUpdate)
					: 'cascade',
		} satisfies ForeignKey
	})
}

function usesPrismaRelationMode(schema: Schema) {
	return schema.ast.list.some(
		(block) =>
			block.type === 'datasource' &&
			block.assignments.some(
				(assignment) =>
					assignment.type === 'assignment' &&
					assignment.key === 'relationMode' &&
					unquote(assignment.value) === 'prisma'
			)
	)
}

function findExplicitName(model: SchemaModel, fieldName: string) {
	if (model.ast == null) return undefined

	const astField = model.ast.properties.find(
		(prop) => prop.type === 'field' && prop.name === fieldName
	)
	if (astField?.type !== 'field') return undefined

	const relation = astField.attributes?.find(
		(attr): attr is Attribute => attr.name === 'relation'
	)
	const map = relation?.args?.find(
		(arg): arg is typeof arg & { value: KeyValue } =>
			typeof arg.value === 'object' &&
			'type' in arg.value &&
			arg.value.type === 'keyValue' &&
			arg.value.key === 'map'
	)
	if (map == null) return undefined
	return unquote(map.value.value)
}

function unquote(value: unknown) {
	if (typeof value !== 'string') {
		throw new Error(`Expected a string literal, received ${String(value)}`)
	}
	return value.replace(/^"(.*)"$/, '$1')
}
