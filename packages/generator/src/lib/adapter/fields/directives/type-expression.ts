const PRIMITIVES = new Set([
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
])

const BUILT_IN_GLOBALS = new Set([
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
	'PropertyKey',
	'Uppercase',
	'Lowercase',
	'Capitalize',
	'Uncapitalize',
	'Iterable',
	'IterableIterator',
	'InstanceType',
	'ConstructorParameters',
	'Function',
	'Error',
	'RegExp',
	'Uint8Array',
	'ArrayBuffer',
])

// Operators that would otherwise tokenize as plain identifiers.
const RESERVED = new Set([
	'keyof',
	'typeof',
	'readonly',
	'infer',
	'extends',
	'unique',
	'is',
	'asserts',
	'new',
	'in',
	'as',
	'satisfies',
])

type Token =
	| { kind: 'identifier'; value: string }
	| { kind: 'string' }
	| { kind: 'number' }
	| { kind: 'punctuation'; value: string }

const TOKEN_PATTERN =
	/\s*(?:([\p{ID_Start}$_][\p{ID_Continue}$‌‍]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\d+(?:\.\d+)?)|([|&[\]<>,().]))/uy

export type TypeExpressionResult =
	| { supported: true; names: string[] }
	| { supported: false }

class UnsupportedTypeExpression extends Error {}

function tokenize(expression: string) {
	const tokens: Token[] = []
	let position = 0
	while (expression.slice(position).trim() !== '') {
		TOKEN_PATTERN.lastIndex = position
		const match = TOKEN_PATTERN.exec(expression)
		if (match == null) throw new UnsupportedTypeExpression()
		position = TOKEN_PATTERN.lastIndex

		if (match[1] != null) tokens.push({ kind: 'identifier', value: match[1] })
		else if (match[2] != null) tokens.push({ kind: 'string' })
		else if (match[3] != null) tokens.push({ kind: 'number' })
		else tokens.push({ kind: 'punctuation', value: match[4] })
	}
	return tokens
}

class Parser {
	private position = 0
	readonly names = new Set<string>()

	constructor(private readonly tokens: Token[]) {}

	parse() {
		this.union()
		if (this.position !== this.tokens.length)
			throw new UnsupportedTypeExpression()
	}

	private peek() {
		return this.tokens[this.position]
	}

	private isPunctuation(value: string) {
		const token = this.peek()
		return token?.kind === 'punctuation' && token.value === value
	}

	private expectPunctuation(value: string) {
		if (!this.isPunctuation(value)) throw new UnsupportedTypeExpression()
		this.position++
	}

	private expectKind(kind: 'string') {
		if (this.peek()?.kind !== kind) throw new UnsupportedTypeExpression()
		this.position++
	}

	private union() {
		this.intersection()
		while (this.isPunctuation('|')) {
			this.position++
			this.intersection()
		}
	}

	private intersection() {
		this.postfix()
		while (this.isPunctuation('&')) {
			this.position++
			this.postfix()
		}
	}

	private postfix() {
		this.primary()
		while (this.isPunctuation('[')) {
			this.position++
			if (this.peek()?.kind === 'string') this.expectKind('string')
			this.expectPunctuation(']')
		}
	}

	private primary() {
		const token = this.peek()
		if (token == null) throw new UnsupportedTypeExpression()

		if (token.kind === 'string' || token.kind === 'number') {
			this.position++
			return
		}

		if (token.kind === 'punctuation') {
			if (token.value !== '(') throw new UnsupportedTypeExpression()
			this.position++
			this.union()
			this.expectPunctuation(')')
			return
		}

		this.position++
		let dotted = false
		while (this.isPunctuation('.')) {
			this.position++
			const member = this.peek()
			if (member?.kind !== 'identifier') throw new UnsupportedTypeExpression()
			this.position++
			dotted = true
		}

		const hasGenerics = this.isPunctuation('<')
		if (PRIMITIVES.has(token.value)) {
			if (dotted || hasGenerics) throw new UnsupportedTypeExpression()
		} else {
			if (RESERVED.has(token.value)) throw new UnsupportedTypeExpression()
			if (dotted || !BUILT_IN_GLOBALS.has(token.value))
				this.names.add(token.value)
		}

		if (hasGenerics) {
			this.position++
			this.union()
			while (this.isPunctuation(',')) {
				this.position++
				this.union()
			}
			this.expectPunctuation('>')
		}
	}
}

/**
 * Finds the names a type expression needs imported, e.g. `Map<Key, Value>`
 * needs `Key` and `Value`. Only a small subset of TypeScript is understood:
 * names, dotted names, generics, `[]`, `['key']`, `|`, `&`, parentheses and
 * literals. Anything else is reported as unsupported rather than guessed at.
 */
export function parseTypeExpression(expression: string): TypeExpressionResult {
	try {
		const tokens = tokenize(expression)

		// A lone name is imported as written, even if it shadows a built-in
		// (e.g. `immutable::Map`).
		const only = tokens.length === 1 ? tokens[0] : undefined
		if (only?.kind === 'identifier') {
			if (PRIMITIVES.has(only.value)) return { supported: true, names: [] }
			if (RESERVED.has(only.value)) return { supported: false }
			return { supported: true, names: [only.value] }
		}

		const parser = new Parser(tokens)
		parser.parse()
		return { supported: true, names: [...parser.names] }
	} catch (err) {
		if (err instanceof UnsupportedTypeExpression) return { supported: false }
		throw err
	}
}
