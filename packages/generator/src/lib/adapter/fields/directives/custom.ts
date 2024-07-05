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

const ImportSchema = v.object({
	name: v.union([v.array(v.string()), v.string()]),
	module: v.string(),
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
