const NON_IMPORTABLE = new Set([
	// keywords and primitives
	'string',
	'number',
	'boolean',
	'bigint',
	'symbol',
	'object',
	'unknown',
	'any',
	'never',
	'void',
	'undefined',
	'null',
	'true',
	'false',
	'keyof',
	'typeof',
	'readonly',
	'infer',
	'extends',
	'unique',
	'is',
	'asserts',
	// built-in global types
	'Array',
	'ReadonlyArray',
	'Record',
	'Partial',
	'Required',
	'Readonly',
	'Pick',
	'Omit',
	'Exclude',
	'Extract',
	'NonNullable',
	'ReturnType',
	'Parameters',
	'Awaited',
	'Promise',
	'Map',
	'Set',
	'ReadonlyMap',
	'ReadonlySet',
	'Date',
])

const STRING_LITERAL = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g
const IDENTIFIER = /[A-Za-z_$][\w$]*/g

/**
 * Names a type expression needs imported, e.g. `Map<Key, Value>` -> `Key`, `Value`.
 * A dotted name such as `ns.Type` only needs its root (`ns`).
 */
export function getImportedTypeNames(expression: string) {
	const withoutLiterals = expression.replace(STRING_LITERAL, '')

	const names = new Set<string>()
	for (const match of withoutLiterals.matchAll(IDENTIFIER)) {
		if (NON_IMPORTABLE.has(match[0])) continue
		if (withoutLiterals[match.index - 1] === '.') continue
		names.add(match[0])
	}
	return [...names]
}
