import type { DMMF } from '@prisma/generator-helper'
import { getModelVarName } from '~/lib/prisma-helpers/model'
import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import type { SchemaFieldRelational } from '~/lib/prisma-helpers/schema/schema-field'
import {
	type SchemaModel,
	getModelFields,
} from '~/lib/prisma-helpers/schema/schema-model'
import { namedImport } from '../../syntaxes/imports'
import type { ModelModule } from '../modules/model'
import {
	countImplicitManyToManyRelations,
	createImplicitJoinTable,
	findModelPrimaryKey,
	findOpposingRelationModel,
	hasReference,
} from './generateTableRelationsDeclaration'

type RelationsDefinitionInput = {
	schema: Schema
	modelModules: ModelModule[]
}

type RelationEntry = {
	name: string
	code: string
	joinTable?: ReturnType<typeof createImplicitJoinTable>
}

/**
 * Drizzle's `defineRelations` (RQB v2). Every relation gets explicit
 * `from`/`to` on both sides instead of relying on drizzle's reverse inference.
 * https://orm.drizzle.team/docs/relations-v2
 */
export function generateRelationsDefinitionDeclaration(
	input: RelationsDefinitionInput
) {
	const relationCounts = countRelationsPerModelPair(input.schema)

	const tables = input.modelModules.flatMap((modelModule) => {
		const relationFields = getModelFields(modelModule.model).filter(
			(field): field is SchemaFieldRelational => field.isRelationField === true
		)
		if (relationFields.length === 0) return []

		return {
			varName: modelModule.tableVar.name,
			entries: relationFields.map((field) =>
				createRelationEntry(field, input.schema, relationCounts)
			),
		}
	})

	const joinTables = new Map<string, DMMF.Model>()
	for (const table of tables) {
		for (const entry of table.entries) {
			if (entry.joinTable) {
				joinTables.set(entry.joinTable.model.name, entry.joinTable.model)
			}
		}
	}

	const joinTableRelations = Array.from(joinTables.values()).map(
		(joinTable) => ({
			varName: getModelVarName(joinTable),
			entries: createJoinTableEntries(joinTable),
		})
	)

	const body = [...tables, ...joinTableRelations]
		.map(
			(table) =>
				`\t${table.varName}: {\n${table.entries
					.map((entry) => `\t\t${entry.name}: ${entry.code},\n`)
					.join('')}\t},\n`
		)
		.join('')

	return {
		name: 'relations',
		imports: [
			namedImport(['defineRelations'], 'drizzle-orm'),
			namedImport(['schema'], './schema'),
		],
		implicit: Array.from(joinTables.values()),
		code: `export const relations = defineRelations(schema, (r) => ({\n${body}}));`,
	}
}

function createRelationEntry(
	field: SchemaFieldRelational,
	schema: Schema,
	relationCounts: Map<string, Set<string>>
): RelationEntry {
	if (field.relationName == null) {
		throw new Error(
			`relationName is null for ${field.name} of ${field.model.getDbName()}`
		)
	}

	const ownVarName = field.model.getVarName()
	const targetVarName = getModelVarName(field.type)
	const alias = hasMultipleRelations(field, relationCounts)
		? field.relationName
		: undefined

	if (hasReference(field)) {
		return {
			name: field.name,
			code: renderRelation({
				kind: 'one',
				targetVarName,
				from: renderColumns(ownVarName, field.relationFromFields),
				to: renderColumns(targetVarName, field.relationToFields),
				optional: field.isRequired,
				alias,
			}),
		}
	}

	const opposingModel = findOpposingRelationModel(field, schema)
	const opposingField = findOpposingField(field, opposingModel)

	if (field.isList && opposingField.isList) {
		if (field.model.dmmf.name === opposingModel.dmmf.name) {
			throw new Error(
				`Cannot generate relation ${field.relationName}: self-referencing implicit many-to-many relations are not supported with relations = "v2"`
			)
		}

		const joinTable = createImplicitJoinTable({
			baseName: field.relationName,
			models: [field.model, opposingModel],
			isUniqueForPair:
				countImplicitManyToManyRelations(schema, [
					field.model.dmmf.name,
					opposingModel.dmmf.name,
				]) === 1,
		})
		const joinVarName = getModelVarName(joinTable.model)
		const ownColumn =
			field.model.dmmf.name === joinTable.modelA.dmmf.name ? 'A' : 'B'
		const targetColumn = ownColumn === 'A' ? 'B' : 'A'

		return {
			name: field.name,
			joinTable,
			code: renderRelation({
				kind: 'many',
				targetVarName,
				from: `${renderColumns(ownVarName, [findModelPrimaryKey(field.model).name])}.through(r.${joinVarName}.${ownColumn})`,
				to: `${renderColumns(targetVarName, [findModelPrimaryKey(opposingModel).name])}.through(r.${joinVarName}.${targetColumn})`,
				alias,
			}),
		}
	}

	return {
		name: field.name,
		code: renderRelation({
			kind: field.isList ? 'many' : 'one',
			targetVarName,
			from: renderColumns(ownVarName, opposingField.relationToFields),
			to: renderColumns(targetVarName, opposingField.relationFromFields),
			alias,
		}),
	}
}

function createJoinTableEntries(joinTable: DMMF.Model): RelationEntry[] {
	const joinVarName = getModelVarName(joinTable)

	return joinTable.fields.flatMap((field) => {
		if (field.kind !== 'object') return []
		if (field.relationFromFields == null || field.relationToFields == null) {
			throw new Error(
				`Relation fields are missing for ${field.name} of ${joinTable.name}`
			)
		}

		const targetVarName = getModelVarName(field.type)
		return {
			name: field.name,
			code: renderRelation({
				kind: 'one',
				targetVarName,
				from: renderColumns(joinVarName, field.relationFromFields),
				to: renderColumns(targetVarName, field.relationToFields),
				optional: field.isRequired,
			}),
		}
	})
}

function renderRelation(input: {
	kind: 'one' | 'many'
	targetVarName: string
	from: string
	to: string
	optional?: boolean
	alias?: string
}) {
	const options = [
		`from: ${input.from}`,
		`to: ${input.to}`,
		// drizzle defaults `optional` to true, so only a required FK needs it spelled out
		input.optional ? 'optional: false' : undefined,
		input.alias ? `alias: '${input.alias}'` : undefined,
	].filter((option) => option != null)

	return `r.${input.kind}.${input.targetVarName}({ ${options.join(', ')} })`
}

function renderColumns(tableVarName: string, columnNames: readonly string[]) {
	if (columnNames.length === 0) {
		throw new Error(`No columns to reference on ${tableVarName}`)
	}

	const columns = columnNames.map((name) => `r.${tableVarName}.${name}`)
	return columns.length === 1 ? columns[0] : `[${columns.join(', ')}]`
}

/**
 * Unlike `findOpposingRelationField`, never resolves to `field` itself,
 * which a self-relation would otherwise do depending on field order.
 */
function findOpposingField(
	field: SchemaFieldRelational,
	opposingModel: SchemaModel
) {
	const isSameModel = opposingModel.dmmf.name === field.model.dmmf.name
	const opposingField = getModelFields(opposingModel).find(
		(f): f is SchemaFieldRelational =>
			f.isRelationField === true &&
			f.relationName === field.relationName &&
			!(isSameModel && f.name === field.name)
	)
	if (opposingField == null) {
		throw new Error(
			`Cannot determine relationship ${field.relationName}, field with relation ${field.relationName} not found`
		)
	}
	return opposingField
}

function getModelPairKey(a: string, b: string) {
	return [a, b].sort().join('\0')
}

/** Distinct relation names between each (unordered) pair of models, self-relations included */
function countRelationsPerModelPair(schema: Schema) {
	const relationNames = new Map<string, Set<string>>()

	for (const model of schema.dmmf.datamodel.models) {
		for (const field of model.fields) {
			if (field.kind !== 'object') continue
			if (field.relationName == null) {
				throw new Error(
					`relationName is null for ${field.name} of ${model.name}`
				)
			}

			const key = getModelPairKey(model.name, field.type)
			const names = relationNames.get(key) ?? new Set<string>()
			names.add(field.relationName)
			relationNames.set(key, names)
		}
	}

	return relationNames
}

function hasMultipleRelations(
	field: SchemaFieldRelational,
	relationNames: Map<string, Set<string>>
) {
	const names = relationNames.get(
		getModelPairKey(field.model.dmmf.name, field.type)
	)
	if (names == null) {
		throw new Error(`No relations counted for ${field.name}`)
	}
	return names.size > 1
}
