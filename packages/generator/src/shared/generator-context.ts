import fs from 'node:fs'
import path from 'node:path'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { getModuleResolution } from '~/lib/config'

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
	const specified = getModuleResolution(options.generator.config)
	if (specified) return specified

	const tsConfigPath = findTsConfig()
	if (!tsConfigPath) return

	const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'))
	return tsConfig?.compilerOptions?.moduleResolution
}

function findTsConfig() {
	let projectDir = process.cwd()
	while (projectDir !== '/') {
		const tsConfigPath = path.join(projectDir, 'tsconfig.json')
		if (fs.existsSync(tsConfigPath)) return tsConfigPath

		projectDir = path.join(projectDir, '..')
	}
}
