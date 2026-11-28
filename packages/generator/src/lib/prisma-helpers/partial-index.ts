import type { AttributeArgument, KeyValue, Model } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'

type AstIndex = {
	kind: 'unique' | 'index'
	fields: string[]
	map: string | undefined
	hasWhere: boolean
}

/**
 * DMMF drops the `where:` of the `partialIndexes` preview feature, so the
 * predicate is looked up in the AST, matching by kind, fields and `map:`.
 */
export function isPartialIndex(
	astModel: Model | undefined,
	index: DMMF.Index
): boolean {
	if (astModel == null || index.type === 'id' || index.type === 'fulltext') {
		return false
	}
	const kind = index.type === 'unique' ? 'unique' : 'index'
	const fields = index.fields.map((f) => f.name)

	return getAstIndexes(astModel).some(
		(ast) =>
			ast.hasWhere &&
			ast.kind === kind &&
			ast.fields.length === fields.length &&
			ast.fields.every((name, i) => name === fields[i]) &&
			(index.dbName == null ? ast.map == null : ast.map === index.dbName)
	)
}

function getAstIndexes(astModel: Model): AstIndex[] {
	return astModel.properties.flatMap((prop): AstIndex[] => {
		if (prop.type === 'field') {
			return (prop.attributes ?? [])
				.filter((attr) => attr.name === 'unique')
				.map((attr) =>
					createAstIndex({ kind: 'unique', fields: [prop.name], attr })
				)
		}
		if (
			prop.type === 'attribute' &&
			(prop.name === 'unique' || prop.name === 'index')
		) {
			return [
				createAstIndex({
					kind: prop.name,
					fields: getBlockAttributeFields(prop),
					attr: prop,
				}),
			]
		}
		return []
	})
}

type AttributeWithArgs = { args?: AttributeArgument[] }

function isKeyValue(value: AttributeArgument['value']): value is KeyValue {
	return (
		typeof value === 'object' && 'type' in value && value.type === 'keyValue'
	)
}

function createAstIndex(args: {
	kind: AstIndex['kind']
	fields: string[]
	attr: AttributeWithArgs
}): AstIndex {
	const keyValues = (args.attr.args ?? []).flatMap((arg) =>
		isKeyValue(arg.value) ? [arg.value] : []
	)
	const map = keyValues.find((kv) => kv.key === 'map')?.value
	if (map != null && typeof map !== 'string') {
		throw new Error(
			`Expected a string literal for map:, received ${String(map)}`
		)
	}

	return {
		kind: args.kind,
		fields: args.fields,
		map: map?.replace(/^"(.*)"$/, '$1'),
		hasWhere: keyValues.some((kv) => kv.key === 'where'),
	}
}

/** The field list is the first positional argument, or `fields:` */
function getBlockAttributeFields(attr: AttributeWithArgs) {
	for (const arg of attr.args ?? []) {
		const value = isKeyValue(arg.value)
			? arg.value.key === 'fields'
				? arg.value.value
				: undefined
			: arg.value
		if (typeof value !== 'object' || !('type' in value)) continue
		if (value.type !== 'array') continue
		// prisma-ast types the elements as strings, but `title(sort: Desc)` is a function node
		return (value.args as (string | { name: string })[]).map((item) =>
			typeof item === 'string' ? item : item.name
		)
	}
	throw new Error('Index attribute has no field list')
}
