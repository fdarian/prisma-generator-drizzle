import type { GeneratorOptions } from '@prisma/generator-helper'
import { type Config, parseConfig } from '~/lib/config'
import { resolveModuleResolution } from './module-resolution'

type Generator = {
	outputBasePath: string
	moduleResolution?: string
	//
	dmmf: GeneratorOptions['dmmf']
	config: Config
}

let generator_: Generator | undefined

// #region initialization

export function initializeGenerator(options: GeneratorOptions) {
	const config = parseConfig(options.generator.config)

	const context: Generator = {
		moduleResolution: config.moduleResolution ?? resolveModuleResolution(),
		outputBasePath: getBasePath(options),
		//
		dmmf: options.dmmf,
		config,
	}
	generator_ = context

	return context
}

function getBasePath(options: GeneratorOptions) {
	const basePath = options.generator.output?.value
	if (!basePath) throw new Error('No output path specified')
	return basePath
}

// #endregion

export function getGenerator() {
	if (generator_ == null) {
		throw new Error('Generator context not set')
	}

	return generator_
}

export function isRelationalQueryEnabled() {
	return getGenerator().config.relationalQuery
}

export function getModuleResolution() {
	return getGenerator().config.moduleResolution
}
