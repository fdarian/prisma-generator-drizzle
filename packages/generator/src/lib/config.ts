import type { GeneratorOptions } from '@prisma/generator-helper'
import {
	type Output,
	type SchemaIssues,
	boolean,
	brand,
	coerce,
	object,
	optional,
	safeParse,
	string,
	transform,
} from 'valibot'
import { getGeneratorContext } from '~/shared/generator-context'

const BooleanInStr = coerce(boolean(), (value) => {
	if (typeof value !== 'string') return value
	return value.toLowerCase() === 'true'
})

export const ModuleResolution = brand(
	transform(string(), (value) => value.toLowerCase()),
	'ModuleResolution'
)

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

export function isRelationalQueryEnabled() {
	return getGeneratorContext().config.relationalQuery
}

class ConfigError extends Error {
	constructor(issues: SchemaIssues) {
		super('Invalid config')
		this.name = 'ConfigError'
	}
}
