import type { GeneratorOptions } from '@prisma/generator-helper'
import {
	type Output,
	type SchemaIssues,
	coerce,
	literal,
	object,
	optional,
	safeParse,
	string,
	union,
} from 'valibot'

const BooleanInStr = coerce(
	union([literal('true'), literal('false')]),
	(value) => {
		if (typeof value !== 'string') return value
		return value.toLowerCase()
	}
)

const Config = object({
	relationalQuery: optional(BooleanInStr),
	moduleResolution: optional(string()),
	verbose: optional(BooleanInStr),
})
export type Config = Output<typeof Config>

export function parseConfig(config: GeneratorOptions['generator']['config']) {
	const parsing = safeParse(Config, config)
	if (!parsing.success) throw new ConfigError(parsing.issues)
	return parsing.output
}

export function isRelationalQueryEnabled(config: Config) {
	const value = config.relationalQuery
	if (value === 'false') return false
	return true
}

export function getModuleResolution(config: Config) {
	if ('moduleResolution' in config) {
		return config.moduleResolution
	}
}

class ConfigError extends Error {
	constructor(issues: SchemaIssues) {
		super('Invalid config')
		this.name = 'ConfigError'
	}
}
