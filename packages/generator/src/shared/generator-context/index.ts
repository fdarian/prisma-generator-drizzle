import type { GeneratorOptions } from '@prisma/generator-helper'
import { type Config, parseConfig } from '~/lib/config'
import { resolveModuleResolution } from './module-resolution'

type Output = {
	isSingleFile: boolean
	path: string
}

type Generator = {
	moduleResolution?: string
	output: Output
	//
	dmmf: GeneratorOptions['dmmf']
	config: Config
}

let generator_: Generator | undefined

// #region initialization

export function initializeGenerator(options: GeneratorOptions) {
	const config = parseConfig(options.generator.config)
	const output = getOutputConfig(options)

	const context: Generator = {
		moduleResolution: config.moduleResolution ?? resolveModuleResolution(),
		output,
		//
		dmmf: options.dmmf,
		config,
	}
	generator_ = context

	return context
}

function getOutputConfig(options: GeneratorOptions): Output {
	const basePath = options.generator.output?.value
	if (!basePath) throw new Error('No output path specified')

	const isSingleFile = basePath.endsWith('.ts')
	if (isSingleFile) {
		return {
			isSingleFile: true,
			path: basePath,
		}
	}

	return {
		isSingleFile: false,
		path: basePath,
	}
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
