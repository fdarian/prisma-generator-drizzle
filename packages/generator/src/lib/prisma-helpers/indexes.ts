import type { DMMF } from '@prisma/generator-helper'
import type { IndexFeatures } from '../adapter/adapter'
import { logger } from '../logger'
import {
	getDefaultConstraintName,
	getDefaultPrimaryKeyName,
	getImplicitJoinTableConstraintName,
} from './constraint-names'
import { isIgnoredField } from './foreign-keys'
import { getDbName } from './getDbName'
import type { Schema } from './schema/schema'
import type { SchemaModel } from './schema/schema-model'

type ResolvedIndexShape = {
	/** Field names (TS keys) in index order */
	columns: { key: string; desc: boolean }[]
	/** Lowercase access method, e.g. `hash` */
	method: string | undefined
}

export type ResolvedIndex =
	| (ResolvedIndexShape & {
			kind: 'primaryKey'
			/** Undefined when the dialect does not name primary keys */
			name: string | undefined
	  })
	| (ResolvedIndexShape & { kind: 'unique' | 'index'; name: string })

type IndexAdapter = {
	maxIdentifierLength: number
	indexFeatures: IndexFeatures
}

/**
 * Primary keys first, then unique indexes, then indexes, each in DMMF order.
 * Reads `datamodel.indexes` rather than `model.primaryKey`, which the
 * synthetic implicit join table models also set.
 */
export function resolveIndexes(
	schema: Schema,
	model: SchemaModel,
	adapter: IndexAdapter
): ResolvedIndex[] {
	if (model.isImplicitJoinTable) {
		return resolveImplicitJoinTableIndexes(model, adapter)
	}

	const resolved = schema.dmmf.datamodel.indexes.flatMap((index) => {
		if (index.model !== model.dmmf.name) return []
		const result = resolveIndex(schema, model, adapter, index)
		return result == null ? [] : [result]
	})

	return [
		...resolved.filter((index) => index.kind === 'primaryKey'),
		...resolved.filter((index) => index.kind === 'unique'),
		...resolved.filter((index) => index.kind === 'index'),
	]
}

/** The key on (A, B) and the index on B, as created by Prisma's schema calculator */
export function resolveImplicitJoinTableIndexes(
	model: SchemaModel,
	adapter: IndexAdapter
): ResolvedIndex[] {
	const tableName = model.getDbName()
	const maxIdentifierLength = adapter.maxIdentifierLength
	const key = adapter.indexFeatures.implicitJoinTableKey
	const columnsAB = [
		{ key: 'A', desc: false },
		{ key: 'B', desc: false },
	]

	return [
		key === 'primaryKey'
			? {
					kind: 'primaryKey',
					name: getImplicitJoinTableConstraintName({
						tableName,
						suffix: '_AB_pkey',
						maxIdentifierLength,
					}),
					columns: columnsAB,
					method: undefined,
				}
			: {
					kind: 'unique',
					name: getImplicitJoinTableConstraintName({
						tableName,
						suffix: '_AB_unique',
						maxIdentifierLength,
					}),
					columns: columnsAB,
					method: undefined,
				},
		{
			kind: 'index',
			name: getImplicitJoinTableConstraintName({
				tableName,
				suffix: '_B_index',
				maxIdentifierLength,
			}),
			columns: [{ key: 'B', desc: false }],
			method: undefined,
		},
	]
}

function resolveIndex(
	schema: Schema,
	model: SchemaModel,
	adapter: IndexAdapter,
	index: DMMF.Index
): ResolvedIndex | undefined {
	const modelName = model.dmmf.name
	// A single-column @id stays on the column
	if (index.type === 'id' && index.fields.length < 2) return undefined

	const fields = index.fields.map((indexField) => ({
		indexField,
		field: model.dmmf.fields.find((f) => f.name === indexField.name),
	}))
	const missing = fields.filter((f) => f.field == null)
	if (missing.length > 0) {
		/** Passes Prisma validation, but the column is not emitted */
		if (
			missing.every((f) => isIgnoredField(schema, modelName, f.indexField.name))
		) {
			return undefined
		}
		throw new Error(
			`Index on ${modelName} references unknown fields ${missing.map((f) => f.indexField.name).join(', ')}`
		)
	}

	const columnNames = fields.flatMap((f) =>
		f.field == null ? [] : [getDbName(f.field)]
	)
	const kind =
		index.type === 'id'
			? 'primaryKey'
			: index.type === 'unique'
				? 'unique'
				: 'index'
	const defaultName =
		kind === 'primaryKey'
			? getDefaultPrimaryKeyName({
					tableName: model.getDbName(),
					maxIdentifierLength: adapter.maxIdentifierLength,
				})
			: getDefaultConstraintName({
					tableName: model.getDbName(),
					columnNames,
					suffix: kind === 'unique' ? '_key' : '_idx',
					maxIdentifierLength: adapter.maxIdentifierLength,
				})
	const name = index.dbName ?? defaultName
	const label =
		kind === 'primaryKey'
			? `primary key "${name}" of ${modelName}`
			: `index "${name}" of ${modelName}`
	const skip = (argument: string) =>
		logger.warn(`Skipped ${argument} of ${label}, Drizzle cannot express it`)

	if (index.type === 'fulltext') {
		skip('the whole fulltext index')
		return undefined
	}
	if (index.clustered != null) skip('clustered')

	const canSort = kind !== 'primaryKey' && adapter.indexFeatures.sortOrder
	const columns = fields.flatMap((f) => {
		if (f.field == null) return []
		const column = f.indexField.name
		if (f.indexField.length != null) skip(`length on ${column}`)
		if (f.indexField.operatorClass != null) skip(`operator class on ${column}`)
		const desc = f.indexField.sortOrder === 'desc'
		if (desc && !canSort) skip(`descending sort on ${column}`)
		return [{ key: column, desc: desc && canSort }]
	})

	const algorithm = index.algorithm
	const method =
		algorithm != null && algorithm.toLowerCase() !== 'btree'
			? algorithm.toLowerCase()
			: undefined
	if (method != null && !adapter.indexFeatures.method)
		skip(`algorithm ${algorithm}`)

	const shape = {
		columns,
		method: adapter.indexFeatures.method ? method : undefined,
	}
	if (kind === 'primaryKey') {
		return {
			...shape,
			kind,
			name: adapter.indexFeatures.primaryKeyName ? name : undefined,
		}
	}
	return { ...shape, kind, name }
}
