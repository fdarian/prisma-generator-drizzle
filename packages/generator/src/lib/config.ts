import type { GeneratorOptions } from '@prisma/generator-helper'
import {
	type Output,
	type SchemaIssues,
	flatten,
	literal,
	object,
	optional,
	safeParse,
} from 'valibot'
import { ModuleResolution } from '~/shared/generator-context/module-resolution'
import { BooleanInStr, withDefault } from './valibot-schema'

const Config = object({
	relationalQuery: withDefault(optional(BooleanInStr), true),
	moduleResolution: optional(ModuleResolution),
	verbose: optional(BooleanInStr),
	formatter: optional(literal('prettier')),
})
export type Config = Output<typeof Config>

export function parseConfig(config: GeneratorOptions['generator']['config']) {
	const parsing = safeParse(Config, config)
	if (!parsing.success) throw new ConfigError(parsing.issues)
	return parsing.output
}

class ConfigError extends Error {
	constructor(issues: SchemaIssues) {
		super(`[prisma-generator-drizzle] Invalid Config:\n${formatError(issues)}`)
		this.name = 'ConfigError'
	}
}

function formatError(issues: SchemaIssues) {
	let message = ''

	const flattened = flatten(issues)
	if (flattened.root) {
		message += `\n- ${flattened.root}`
	}

	for (const [key, issues] of Object.entries(flattened.nested)) {
		message += `\n- ${key}: ${issues}`
	}

	return message
}
