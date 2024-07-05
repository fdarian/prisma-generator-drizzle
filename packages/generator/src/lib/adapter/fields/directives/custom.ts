import type { DMMF } from '@prisma/generator-helper'
import * as v from 'valibot'
import getErrorMessage from '~/lib/error-message'

const DIRECTIVE = 'drizzle.custom'

export function getCustomDirective(field: DMMF.Field) {
	const directiveInput = field.documentation
	if (directiveInput == null || !directiveInput.startsWith(DIRECTIVE)) {
		return
	}

	const parsing = v.safeParse(DirectiveSchema, parseJson(directiveInput))
	if (!parsing.success) throw new InvalidDirectiveShapeError(parsing.issues)
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

const DirectiveSchema = v.object({
	imports: v.optional(v.array(ImportSchema)),
	$type: v.optional(v.string()),
	default: v.optional(v.string()),
})

class InvalidDirectiveShapeError extends Error {
	constructor(issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]) {
		super(
			`Invalid ${DIRECTIVE} definition:\n\n${JSON.stringify(v.flatten(issues), null, 2)}`
		)
	}
}

function parseJson(directiveInput: string) {
	try {
		return JSON.parse(directiveInput.replace(DIRECTIVE, ''))
	} catch (err) {
		throw new Error(
			`Invalid ${DIRECTIVE} JSON shape\n\n${getErrorMessage(err)}`
		)
	}
}
