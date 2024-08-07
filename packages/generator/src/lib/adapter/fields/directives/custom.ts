import * as v from 'valibot'
import getErrorMessage from '~/lib/error-message'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'

const DIRECTIVE = 'drizzle.custom'

export function getCustomDirective(field: SchemaField) {
	const directiveInput = field.documentation
	if (directiveInput == null || !directiveInput.startsWith(DIRECTIVE)) {
		return
	}

	const parsing = v.safeParse(DirectiveSchema, parseJson(directiveInput))
	if (!parsing.success)
		throw new InvalidDirectiveShapeError({
			input: directiveInput,
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
		input: string
		issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]
	}) {
		super(
			`Invalid ${DIRECTIVE} definition:\n\n— Error:${JSON.stringify(v.flatten(args.issues), null, 2)}\n—\n\n— Your Input\n${args.input}\n—`
		)
	}
}

function parseJson(directiveInput: string) {
	try {
		return JSON.parse(directiveInput.replace(DIRECTIVE, ''))
	} catch (err) {
		throw new Error(
			`Invalid ${DIRECTIVE} JSON shape\n\n— Error:\n${getErrorMessage(err)}\n—\n\n— Your Input\n${directiveInput}\n—`
		)
	}
}
