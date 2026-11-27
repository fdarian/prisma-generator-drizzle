import * as v from 'valibot'
import getErrorMessage from '~/lib/error-message'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'

const DIRECTIVE = 'drizzle.custom'

export function getCustomDirective(field: SchemaField) {
	if (field.documentation == null) return

	const lines = field.documentation.split('\n')
	const start = lines.findIndex((line) =>
		line.trimStart().startsWith(DIRECTIVE)
	)
	if (start === -1) return

	const directiveLines = lines.slice(start)
	directiveLines[0] = directiveLines[0].trimStart().slice(DIRECTIVE.length)

	const json = parseJson(field, directiveLines)
	const parsing = v.safeParse(DirectiveSchema, json)
	if (!parsing.success)
		throw new InvalidDirectiveShapeError({
			field,
			input: lines.slice(start).join('\n'),
			issues: parsing.issues,
		})
	return parsing.output
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
	let lastError: unknown
	for (let count = 1; count <= directiveLines.length; count++) {
		try {
			return JSON.parse(directiveLines.slice(0, count).join('\n'))
		} catch (err) {
			lastError = err
		}
	}

	throw new Error(
		`Invalid ${DIRECTIVE} JSON shape on field "${field.name}"\n\n— Error:\n${getErrorMessage(lastError)}\n—\n\n— Your Input\n${DIRECTIVE}${directiveLines.join('\n')}\n—`
	)
}
