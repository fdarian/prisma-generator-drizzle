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
	const columns = index.columns.map(
		(column) => `table.${column.key}${column.desc ? '.desc()' : ''}`
	)

	if (index.kind === 'primaryKey') {
		const props = [
			...(index.name == null ? [] : [`name: ${JSON.stringify(index.name)}`]),
			`columns: [${columns.join(', ')}]`,
		]
		return `primaryKey({ ${props.join(', ')} })`
	}

	if (index.name == null) {
		throw new Error(`${index.kind} index has no name`)
	}
	const builder = `${getBuilderName(index)}(${JSON.stringify(index.name)})`
	return index.method == null
		? `${builder}.on(${columns.join(', ')})`
		: `${builder}.using('${index.method}', ${columns.join(', ')})`
}
