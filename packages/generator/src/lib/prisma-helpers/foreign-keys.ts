import type { Attribute, KeyValue } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { getDbName } from './getDbName'
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
	/** `@relation(map: "...")`, else Prisma's default constraint name */
	name: string
	/** Field names (TS keys) of the model owning the foreign key */
	columns: string[]
	target: {
		isSelf: boolean
		varName: string
		moduleName: string
		model: DMMF.Model
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

/** Foreign keys that migrations can create, see `isTargetConstraintEmitted` */
export function getForeignKeys(
	schema: Schema,
	model: SchemaModel,
	maxIdentifierLength: number
): ForeignKey[] {
	return resolveForeignKeys(schema, model, maxIdentifierLength).filter(
		isTargetConstraintEmitted
	)
}

/** The generator does not emit composite `@@id`, `@@unique` or `@unique` constraints yet (#79), so only a single-column `@id` target is safe to reference; #79 removes this. */
export function isTargetConstraintEmitted(foreignKey: ForeignKey) {
	const target = foreignKey.target
	if (target.model.primaryKey != null) return false
	if (target.columns.length !== 1) return false
	return target.model.fields.some(
		(field) => field.name === target.columns[0] && field.isId
	)
}

/**
 * Mirrors `foreign_key_constraint_name` in prisma-engines, where lengths are
 * UTF-8 bytes and truncation backs off to a character boundary.
 */
export function getDefaultForeignKeyName(args: {
	tableName: string
	columnNames: string[]
	maxIdentifierLength: number
}) {
	const joined = new TextEncoder().encode(
		`${args.tableName}_${args.columnNames.join('_')}`
	)
	const limit = args.maxIdentifierLength - 5
	if (joined.length < limit) {
		return `${new TextDecoder().decode(joined)}_fkey`
	}

	let end = limit
	// Continuation bytes (0b10xxxxxx) are not the start of a character
	while (end > 0 && (joined[end] & 0xc0) === 0x80) end--
	return `${new TextDecoder().decode(joined.subarray(0, end))}_fkey`
}

export function resolveForeignKeys(
	schema: Schema,
	model: SchemaModel,
	maxIdentifierLength: number
): ForeignKey[] {
	if (usesPrismaRelationMode(schema)) return []

	return getModelFields(model).flatMap((field) => {
		if (field.isRelationField !== true) return []
		// The side of the relation that does not own the foreign key
		if (field.relationFromFields.length === 0) return []

		const modelName = model.dmmf.name
		if (field.relationToFields.length === 0) {
			throw new Error(
				`Relation ${modelName}.${field.name} has fields but no references`
			)
		}

		const targetModel = schema.dmmf.datamodel.models.find(
			(m) => m.name === field.type
		)
		if (targetModel == null) {
			/** Passes Prisma validation, but the target table is not emitted */
			if (isIgnoredModel(schema, field.type)) return []
			throw new Error(
				`Relation ${modelName}.${field.name} targets unknown model ${field.type}`
			)
		}

		/** In the order of `fields`, which is the column order Prisma names the constraint after */
		const localFields = field.relationFromFields.flatMap((name) =>
			model.dmmf.fields.filter((f) => f.name === name)
		)
		const missingLocal = field.relationFromFields.filter(
			(name) => !localFields.some((f) => f.name === name)
		)
		if (missingLocal.length > 0) {
			/** Passes Prisma validation, but the column is not emitted */
			if (
				missingLocal.every((name) => isIgnoredField(schema, modelName, name))
			) {
				return []
			}
			throw new Error(
				`Relation ${modelName}.${field.name} references unknown fields ${missingLocal.join(', ')}`
			)
		}

		const missingTarget = field.relationToFields.filter(
			(name) => !targetModel.fields.some((f) => f.name === name)
		)
		if (missingTarget.length > 0) {
			/** Passes Prisma validation, but the column is not emitted */
			if (
				missingTarget.every((name) =>
					isIgnoredField(schema, targetModel.name, name)
				)
			) {
				return []
			}
			throw new Error(
				`Relation ${modelName}.${field.name} references unknown fields ${missingTarget.join(', ')} of ${targetModel.name}`
			)
		}

		const isRequired = field.isRequired || localFields.some((f) => f.isRequired)

		return {
			name:
				findExplicitName(model, field.name) ??
				getDefaultForeignKeyName({
					tableName: model.getDbName(),
					columnNames: localFields.map((f) => getDbName(f)),
					maxIdentifierLength,
				}),
			columns: [...field.relationFromFields],
			target: {
				isSelf: targetModel.name === model.dmmf.name,
				varName: getModelVarName(targetModel),
				moduleName: getModelModuleName(targetModel),
				model: targetModel,
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

function findAstModel(schema: Schema, modelName: string) {
	const block = schema.ast.list.find(
		(b) => b.type === 'model' && b.name === modelName
	)
	return block?.type === 'model' ? block : undefined
}

function isIgnoredModel(schema: Schema, modelName: string) {
	return (
		findAstModel(schema, modelName)?.properties.some(
			(prop) => prop.type === 'attribute' && prop.name === 'ignore'
		) === true
	)
}

function isIgnoredField(schema: Schema, modelName: string, fieldName: string) {
	const astField = findAstModel(schema, modelName)?.properties.find(
		(prop) => prop.type === 'field' && prop.name === fieldName
	)
	return (
		astField?.type === 'field' &&
		astField.attributes?.some((attr) => attr.name === 'ignore') === true
	)
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
	// Implicit many-to-many join tables have no AST and no `@relation(map:)`
	if (model.ast == null) return undefined

	const astField = model.ast.properties.find(
		(prop) => prop.type === 'field' && prop.name === fieldName
	)
	if (astField?.type !== 'field') {
		throw new Error(`Ast field ${model.dmmf.name}.${fieldName} not found`)
	}

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
