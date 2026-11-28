import type { ResolvedIndex } from '~/lib/prisma-helpers/indexes'
import { namedImport } from '~/lib/syntaxes/imports'

const BUILDER_NAMES = ['primaryKey', 'uniqueIndex', 'index'] as const

export function createConstraintEntries(args: {
	coreModule: string
	indexes: ResolvedIndex[]
}) {
	const used = BUILDER_NAMES.filter((builder) =>
		args.indexes.some((index) => getBuilderName(index) === builder)
	)

	return {
		entries: args.indexes.map(createIndexEntry),
		imports: used.length > 0 ? [namedImport([...used], args.coreModule)] : [],
	}
}

function getBuilderName(index: ResolvedIndex) {
	if (index.kind === 'primaryKey') return 'primaryKey'
	return index.kind === 'unique' ? 'uniqueIndex' : 'index'
}

export function createIndexEntry(index: ResolvedIndex) {
	const columns = index.columns.map(createColumnExpression)

	if (index.kind === 'primaryKey') {
		const props = [
			...(index.name == null ? [] : [`name: ${JSON.stringify(index.name)}`]),
			`columns: [${columns.join(', ')}]`,
		]
		return `primaryKey({ ${props.join(', ')} })`
	}

	const builder = `${getBuilderName(index)}(${JSON.stringify(index.name)})`
	return index.method == null
		? `${builder}.on(${columns.join(', ')})`
		: `${builder}.using('${index.method}', ${columns.join(', ')})`
}

function createColumnExpression(column: ResolvedIndex['columns'][number]) {
	// `desc` is only set on Postgres, where Prisma's DESC is NULLS FIRST and a bare Drizzle `.desc()` is NULLS LAST
	const sort = column.desc ? '.desc().nullsFirst()' : ''
	const operatorClass =
		column.operatorClass == null
			? ''
			: `.op(${JSON.stringify(column.operatorClass)})`
	return `table.${column.key}${sort}${operatorClass}`
}
