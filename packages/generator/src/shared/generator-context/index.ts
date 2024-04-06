import type { GeneratorOptions } from '@prisma/generator-helper'
import { type Config, parseConfig } from '~/lib/config'
import { resolveModuleResolution } from './module-resolution'

type GeneratorContext = {
	moduleResolution?: string
	config: Config
}

let generatorContext_: GeneratorContext | undefined

export function setGeneratorContext(options: GeneratorOptions) {
	const config = parseConfig(options.generator.config)

	const context: GeneratorContext = {
		moduleResolution: config.moduleResolution ?? resolveModuleResolution(),
		config,
	}
	generatorContext_ = context

	return context
}

export function getGeneratorContext() {
	if (generatorContext_ == null) {
		throw new Error('Generator context not set')
	}

	return generatorContext_
}

export function isRelationalQueryEnabled() {
	return getGeneratorContext().config.relationalQuery
}

export function getModuleResolution() {
	return getGeneratorContext().config.moduleResolution
}
