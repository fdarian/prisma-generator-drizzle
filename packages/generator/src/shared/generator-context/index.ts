import type { GeneratorOptions } from '@prisma/generator-helper'
import { type Config, parseConfig } from '~/lib/config'
import { resolveModuleResolution } from './module-resolution'

type GeneratorContext = {
	outputBasePath: string
	moduleResolution?: string
	config: Config
}

let generatorContext_: GeneratorContext | undefined

// #region initialization

export function initializeGenerator(options: GeneratorOptions) {
	const config = parseConfig(options.generator.config)

	const context: GeneratorContext = {
		moduleResolution: config.moduleResolution ?? resolveModuleResolution(),
		outputBasePath: getBasePath(options),
		config,
	}
	generatorContext_ = context

	return context
}

function getBasePath(options: GeneratorOptions) {
	const basePath = options.generator.output?.value
	if (!basePath) throw new Error('No output path specified')
	return basePath
}

// #endregion

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
