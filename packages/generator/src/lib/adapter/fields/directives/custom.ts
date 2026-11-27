import * as v from 'valibot'
import getErrorMessage from '~/lib/error-message'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'

const DIRECTIVE = 'drizzle.custom'

export function getCustomDirective(field: SchemaField) {
	if (field.documentation == null) return

	const lines = field.documentation.split('\n')
	const start = lines.findIndex(isDirectiveLine)
	if (start === -1) return

	const directiveLines = lines.slice(start)
	const parsed = parseJson(field, directiveLines)
	const shape = v.safeParse(DirectiveSchema, parsed.json)
	if (!shape.success)
		throw new InvalidDirectiveShapeError({
			field,
			input: directiveLines.slice(0, parsed.consumedLines).join('\n'),
			issues: shape.issues,
		})
	return shape.output
}

/** Ignores prose such as `drizzle.custom is not used here` or `drizzle.customType`. */
function isDirectiveLine(line: string) {
	const trimmed = line.trimStart()
	if (!trimmed.startsWith(DIRECTIVE)) return false

	const rest = trimmed.slice(DIRECTIVE.length).trim()
	return rest === '' || rest.startsWith('{')
}

const NamedImportSchema = v.pipe(
	v.array(v.string()),
	v.transform((names) => ({
		type: 'named-import' as const,
		names,
	}))
)

const DefaultImportSchema = v.pipe(
	v.string(),
	v.transform((name) => ({
		type: 'default-import' as const,
		name,
	}))
)

const ImportSchema = v.object({
	name: v.union([NamedImportSchema, DefaultImportSchema]),
	/** e.g. "drizzle-orm" or "../my-type" */
	module: v.string(),
	/** Marks the import as a type import */
	type: v.optional(v.boolean()),
})

const BigIntMode = v.picklist(['number', 'bigint'])
export type BigIntMode = v.InferOutput<typeof BigIntMode>

const FieldSchema = v.object({
	mode: v.optional(BigIntMode),
})

const DirectiveSchema = v.object({
	imports: v.optional(v.array(ImportSchema)),
	$type: v.optional(v.string()),
	default: v.optional(v.string()),
	field: v.optional(FieldSchema),
})

class InvalidDirectiveShapeError extends Error {
	constructor(args: {
		field: SchemaField
		input: string
		issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]
	}) {
		super(
			`Invalid ${DIRECTIVE} definition on field "${args.field.name}":\n\n— Error:${JSON.stringify(v.flatten(args.issues), null, 2)}\n—\n\n— Your Input\n${args.input}\n—`
		)
	}
}

/**
 * Doc lines may follow the JSON block, so the JSON ends at the first
 * line count where the accumulated text parses.
 */
function parseJson(field: SchemaField, directiveLines: string[]) {
	const firstLine = directiveLines[0].trimStart().slice(DIRECTIVE.length)
	const jsonLines = [firstLine, ...directiveLines.slice(1)]

	let lastError: unknown
	for (let count = 1; count <= jsonLines.length; count++) {
		try {
			return {
				json: JSON.parse(jsonLines.slice(0, count).join('\n')),
				consumedLines: count,
			}
		} catch (err) {
			lastError = err
		}
	}

	throw new Error(
		`Invalid ${DIRECTIVE} JSON shape on field "${field.name}"\n\n— Error:\n${getErrorMessage(lastError)}\n—\n\n— Your Input\n${directiveLines.join('\n')}\n—`
	)
}
