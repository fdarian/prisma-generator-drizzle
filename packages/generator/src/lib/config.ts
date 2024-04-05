import type { GeneratorOptions } from '@prisma/generator-helper'
import {
	type Output,
	type SchemaIssues,
	boolean,
	coerce,
	flatten,
	object,
	optional,
	safeParse,
} from 'valibot'
import { ModuleResolution } from '~/shared/generator-context'

const BooleanInStr = coerce(boolean(), (value) => {
	if (typeof value !== 'string') return value
	return value.toLowerCase() === 'true'
})

const Config = object({
	relationalQuery: optional(BooleanInStr),
	moduleResolution: optional(ModuleResolution),
	verbose: optional(BooleanInStr),
})
export type Config = Output<typeof Config>

export function parseConfig(config: GeneratorOptions['generator']['config']) {
	const parsing = safeParse(Config, config)
	if (!parsing.success) throw new ConfigError(parsing.issues)
	return parsing.output
}

class ConfigError extends Error {
	constructor(issues: SchemaIssues) {
		super(`\n${formatError(issues)}`)
		this.name = 'ConfigError'
	}
}

function formatError(issues: SchemaIssues) {
	let message = ''

	const flattened = flatten(issues)
	if (flattened.root) {
		message += `${flattened.root}\n`
	}

	for (const [key, issues] of Object.entries(flattened.nested)) {
		message += `\n${key}: ${issues}\n`
	}

	return message
}
