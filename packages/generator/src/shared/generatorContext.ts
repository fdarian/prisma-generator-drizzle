import path from 'path'
import fs from 'fs'
import { GeneratorOptions } from '@prisma/generator-helper'

type GeneratorContext = {
	moduleResolution?: string
}

let generatorContext_: GeneratorContext | undefined

export function setGeneratorContext(options: GeneratorOptions) {
	generatorContext_ = {
		moduleResolution: resolveModuleResolution(options),
	}
}

export function getGeneratorContext() {
	if (generatorContext_ == null) {
		throw new Error('Generator context not set')
	}

	return generatorContext_
}

function resolveModuleResolution(options: GeneratorOptions) {
	const tsConfig = readTsConfig(options)
	return tsConfig?.compilerOptions?.moduleResolution
}

function readTsConfig(options: GeneratorOptions) {
	let tsConfigPath = path.join(process.cwd(), 'tsconfig.json')

	if (!fs.existsSync(tsConfigPath)) {
		let resolutionPath = options.generator.output?.value
		if (!resolutionPath) return

		while (!fs.existsSync(tsConfigPath)) {
			if (resolutionPath === '/') return
			resolutionPath = path.join(resolutionPath, '..')
		}

		tsConfigPath = path.join(resolutionPath, 'tsconfig.json')
	}

	const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'))
	return tsConfig
}
