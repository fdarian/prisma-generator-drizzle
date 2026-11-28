import type { DMMF } from '@prisma/generator-helper'
import { map } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { camelCase, kebabCase, upperFirst } from 'lodash'
import pluralize from 'pluralize'
import { getModelVarName } from '~/lib/prisma-helpers/model'
import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import type { SchemaFieldRelational } from '~/lib/prisma-helpers/schema/schema-field'
import {
	type SchemaModel,
	createSchemaModel,
	findCorrespondingAstModel,
	getModelFields,
} from '~/lib/prisma-helpers/schema/schema-model'
import { namedImport } from '../../syntaxes/imports'
import type { ModelModule } from '../modules/model'

type GenerateTableRelationsInput = {
	fields: Array<SchemaFieldRelational>
	modelModule: ModelModule
	schema: Schema
}

export function generateTableRelationsDeclaration(
	input: GenerateTableRelationsInput
) {
	const { tableVar } = input.modelModule
	const name = `${tableVar.name}Relations`
	const _fields = input.fields.map(getRelationField(input))

	const func = `relations(${tableVar.name}, (helpers) => ({ ${_fields
		.map((f) => `${f.name}: ${f.func}`)
		.join(', ')} }))`

	return {
		name,
		imports: [
			namedImport(['relations'], 'drizzle-orm'),
			namedImport([tableVar.name], `./${input.modelModule.name}`),
			..._fields.flatMap((field) => field.imports),
		],
		implicit: _fields.flatMap((field) => field.implicit),
		code: `export const ${name} = ${func};`,
	}
}

function getRelationField(ctx: GenerateTableRelationsInput) {
	return (field: SchemaFieldRelational) => {
		const { implicit, opts, referenceModelVarName } = !field.isList
			? getOneToOneOrManyRelation(field, ctx)
			: opposingIsList(field, ctx)
				? getManyToManyRelation(field, ctx)
				: getManyToOneRelation(field)

		const relFunc = field.isList ? 'helpers.many' : 'helpers.one'

		return {
			name: field.name,
			implicit: implicit,
			imports: [
				namedImport(
					[referenceModelVarName],
					`./${kebabCase(referenceModelVarName)}`
				),
			],
			func: `${relFunc}(${referenceModelVarName}${opts ? `, ${opts}` : ''})`,
		}
	}
}

class DetermineRelationshipError extends Error {
	constructor(field: SchemaFieldRelational, message: string) {
		super(`Cannot determine relationship ${field.relationName}, ${message}`)
	}
}

function getManyToManyRelation(
	field: SchemaFieldRelational,
	ctx: GenerateTableRelationsInput
) {
	if (field.relationName == null)
		throw new Error(
			`relationName is null for ${field.name} of ${field.model.getDbName()}`
		)

	const opposingModel = findOpposingRelationModel(field, ctx.schema)
	const joinTable = createImplicitJoinTable({
		baseName: field.relationName,
		models: [ctx.modelModule.model, opposingModel],
		isUniqueForPair:
			countImplicitManyToManyRelations(ctx.schema, [
				ctx.modelModule.model.dmmf.name,
				opposingModel.dmmf.name,
			]) === 1,
	})

	const selfSide = isSelfRelation(field, opposingModel)
		? getSelfRelationSide(
				field,
				findOpposingRelationField(field, opposingModel)
			)
		: null

	return createRelation({
		referenceModelVarName: getModelVarName(joinTable.varName),
		opts:
			selfSide == null
				? undefined
				: createRelationOpts({
						relationName: `${field.relationName}_${selfSide}`,
					}),
		implicit: [joinTable.model],
	})
}

function isSelfRelation(
	field: SchemaFieldRelational,
	opposingModel: SchemaModel
) {
	return field.model.dmmf.name === opposingModel.dmmf.name
}

/** Prisma gives side A to the self relation field whose name sorts first, by byte order rather than declaration order */
function getSelfRelationSide(
	field: SchemaFieldRelational,
	opposingField: SchemaFieldRelational
) {
	return field.name < opposingField.name ? 'A' : 'B'
}

function createRelation(input: {
	referenceModelVarName: string
	opts?: ReturnType<typeof createRelationOpts>
	implicit?: DMMF.Model[]
}) {
	return {
		referenceModelVarName: input.referenceModelVarName,
		opts: input.opts ?? null,
		implicit: input.implicit ?? [],
	}
}

function holdsForeignKey(args: {
	field: SchemaFieldRelational
	model: SchemaModel
}) {
	const { field, model } = args
	return getModelFields(model).some((f) =>
		field.relationFromFields.some((from) => f.name === from)
	)
}

function getOneToOneOrManyRelation(
	field: SchemaFieldRelational,
	ctx: GenerateTableRelationsInput
) {
	if (hasReference(field)) {
		return createRelation({
			referenceModelVarName: getModelVarName(field.type),
			opts: holdsForeignKey({ field, model: ctx.modelModule.model })
				? createRelationOpts({
						relationName: field.relationName,
						from: {
							modelVarName: ctx.modelModule.model.getVarName(),
							fieldNames: field.relationFromFields,
						},
						to: {
							modelVarName: getModelVarName(field.type),
							fieldNames: field.relationToFields,
						},
					})
				: undefined,
		})
	}

	// For disambiguating relation

	const opposingModel = findOpposingRelationModel(field, ctx.schema)
	const opposingField = findOpposingRelationField(field, opposingModel)

	return createRelation({
		referenceModelVarName: getModelVarName(field.type),
		opts:
			holdsForeignKey({ field, model: ctx.modelModule.model }) ||
			// ⚠️ This is a workaround for the following issue since this case isn't common
			// https://github.com/fdarian/prisma-generator-drizzle/issues/69#issuecomment-2187174021
			hasMultipleDisambiguatingRelations({
				field,
				model: ctx.modelModule.model,
			})
				? createRelationOpts({
						relationName: field.relationName,
						from: {
							modelVarName: ctx.modelModule.model.getVarName(),
							fieldNames: opposingField.relationToFields,
						},
						to: {
							modelVarName: getModelVarName(field.type),
							fieldNames: opposingField.relationFromFields,
						},
					})
				: undefined,
	})
}

function getManyToOneRelation(field: SchemaFieldRelational) {
	const opts = createRelationOpts({ relationName: field.relationName })
	return createRelation({
		referenceModelVarName: getModelVarName(field.type),
		opts,
	})
}

/**
 * Construct Drizzle's `relation()` syntax
 * https://orm.drizzle.team/docs/rqb#declaring-relations
 */
function createRelationOpts(input: {
	relationName?: string
	to?: {
		modelVarName: string
		fieldNames: readonly string[]
	}
	from?: {
		modelVarName: string
		fieldNames: readonly string[]
	}
}) {
	const { relationName, from, to } = input

	const entries = Object.entries({
		relationName: relationName ? `'${relationName}'` : null,
		fields: from
			? `[ ${from.fieldNames
					.map((fieldName) => `${from.modelVarName}.${fieldName}`)
					.join(', ')} ]`
			: null,
		references: to
			? `[ ${to.fieldNames
					.map((fieldName) => `${to.modelVarName}.${fieldName}`)
					.join(', ')} ]`
			: null,
	}).flatMap(([key, value]) => (value == null ? [] : `${key}: ${value}`))

	if (entries.length === 0) return
	return `{ ${entries.join(', ')} }`
}

export function createImplicitJoinTable(input: {
	/** The `field.relationName` referring to the generated join table */
	baseName: string
	/** Two models having a many-to-many relationship, which can be the same model */
	models: [SchemaModel, SchemaModel]
	/** Whether this is the only implicit many-to-many relation between the two models */
	isUniqueForPair: boolean
}) {
	const baseName = input.baseName
	/** Prisma assigns column A/B by sorting the model names (not the mapped db names), by byte order rather than locale */
	const sorted = [...input.models].sort((a, b) =>
		a.dmmf.name < b.dmmf.name ? -1 : a.dmmf.name > b.dmmf.name ? 1 : 0
	)
	const modelA = sorted[0]
	const modelB = sorted[1]
	const pair = [modelA.dmmf.name, modelB.dmmf.name]
	const isSelf = modelA.dmmf.name === modelB.dmmf.name

	// Custom varName following drizzle's convention
	const pairName = pipe(pair, map(pluralize), (names) => names.join('To'))
	const name = input.isUniqueForPair
		? pairName
		: `${pairName}${upperFirst(camelCase(baseName))}`
	const varName = camelCase(name)

	const fieldNameA = isSelf ? `${camelCase(pair[0])}A` : camelCase(pair[0])
	const fieldNameB = isSelf ? `${camelCase(pair[1])}B` : camelCase(pair[1])

	const model = {
		name: name,
		dbName: `_${baseName}`,
		// `prisma migrate diff` places the join table in the schema of the model sorting first
		schema: modelA.dmmf.schema,
		fields: [
			createJoinColumn('A', findModelPrimaryKey(modelA)),
			{
				name: fieldNameA,
				kind: 'object',
				isList: false,
				isRequired: true,
				isUnique: false,
				isId: false,
				isReadOnly: false,
				hasDefaultValue: false,
				type: pair[0],
				...(isSelf ? { relationName: `${baseName}_A` } : {}),
				relationFromFields: ['A'],
				relationToFields: [findModelPrimaryKey(modelA).name],
				relationOnDelete: 'Cascade',
				relationOnUpdate: 'Cascade',
				isGenerated: false,
				isUpdatedAt: false,
			},
			createJoinColumn('B', findModelPrimaryKey(modelB)),
			{
				name: fieldNameB,
				kind: 'object',
				isList: false,
				isRequired: true,
				isUnique: false,
				isId: false,
				isReadOnly: false,
				hasDefaultValue: false,
				type: pair[1],
				...(isSelf ? { relationName: `${baseName}_B` } : {}),
				relationFromFields: ['B'],
				relationToFields: [findModelPrimaryKey(modelB).name],
				relationOnDelete: 'Cascade',
				relationOnUpdate: 'Cascade',
				isGenerated: false,
				isUpdatedAt: false,
			},
		],
		primaryKey: { name: null, fields: ['A', 'B'] },
		uniqueFields: [],
		uniqueIndexes: [],
		isGenerated: false,
	} satisfies DMMF.Model

	return { varName, baseName, model, modelA, modelB }
}

/** Prisma types a join table column like the id it references */
function createJoinColumn(name: 'A' | 'B', pkField: DMMF.Field) {
	return {
		name,
		kind: pkField.kind,
		isList: false,
		isRequired: true,
		isUnique: false,
		isId: false,
		isReadOnly: false,
		hasDefaultValue: false,
		type: pkField.type,
		nativeType: pkField.nativeType,
		isGenerated: false,
		isUpdatedAt: false,
	} satisfies DMMF.Field
}

function countImplicitManyToManyRelations(
	schema: Schema,
	names: [string, string]
) {
	const models = schema.dmmf.datamodel.models
	const first = models.find((m) => m.name === names[0])
	const second = models.find((m) => m.name === names[1])
	if (first == null || second == null)
		throw new Error(`Model ${names[0]} or ${names[1]} not found`)

	const relationNames = new Set<string>()
	for (const field of first.fields) {
		if (field.kind !== 'object' || !field.isList || field.type !== second.name)
			continue
		if (field.relationName == null)
			throw new Error(`relationName is null for ${field.name} of ${first.name}`)
		const opposingField = second.fields.find(
			(f) =>
				f.relationName === field.relationName &&
				!(second === first && f.name === field.name)
		)
		if (opposingField == null)
			throw new Error(
				`Opposite field of relation ${field.relationName} not found in model ${second.name}`
			)
		if (opposingField.isList) relationNames.add(field.relationName)
	}
	return relationNames.size
}

export function findModelPrimaryKey(model: SchemaModel) {
	const pkField = model.dmmf.fields.find((field) => field.isId)
	if (pkField == null)
		throw new Error(`Primary key not found in model ${model.dmmf.name}`)
	return pkField
}

export function findOpposingRelationModel(
	field: SchemaFieldRelational,
	schema: Schema
) {
	const opposingModel = schema.dmmf.datamodel.models.find(
		(m) => m.name === field.type
	)
	if (opposingModel) {
		return createSchemaModel({
			astModel: findCorrespondingAstModel(schema.ast, opposingModel),
			dmmfModel: opposingModel,
		})
	}
	throw new DetermineRelationshipError(field, `model ${field.type} not found`)
}

function findOpposingRelationField(
	field: SchemaFieldRelational,
	opposingModel: SchemaModel
) {
	const opposingField = getModelFields(opposingModel).find(
		(f) =>
			f.isRelationField &&
			f.relationName === field.relationName &&
			// A self relation has both of its fields on the same model
			!(f.model.dmmf.name === field.model.dmmf.name && f.name === field.name)
	)
	if (opposingField) return opposingField as SchemaFieldRelational
	throw new DetermineRelationshipError(
		field,
		`field with relation ${field.relationName} not found`
	)
}

/**
 * Not a derived relation in which the model holds the reference.
 * Can be one-to-one or one-to-many
 */
export function hasReference(field: SchemaFieldRelational) {
	return (
		field.relationFromFields.length > 0 && field.relationToFields.length > 0
	)
}

function opposingIsList(
	field: SchemaFieldRelational,
	ctx: GenerateTableRelationsInput
) {
	const opposingModel = findOpposingRelationModel(field, ctx.schema)
	return findOpposingRelationField(field, opposingModel).isList
}

function hasMultipleDisambiguatingRelations(args: {
	field: SchemaFieldRelational
	model: SchemaModel
}): boolean {
	let count = 0
	for (const field of getModelFields(args.model)) {
		if (
			field.type === args.field.type &&
			field.isRelationField &&
			!hasReference(field)
		) {
			count++
		}
		if (count > 1) return true
	}
	return false
}
