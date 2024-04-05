import fs from 'node:fs'
import path from 'node:path'
import type { GeneratorOptions } from '@prisma/generator-helper'
import { object, parse, string } from 'valibot'
import { type Config, getModuleResolution, parseConfig } from '~/lib/config'
import stripJsonComments from '~/lib/strip-json-comments'

type GeneratorContext = {
	moduleResolution?: string
	config: Config
}

let generatorContext_: GeneratorContext | undefined

export function setGeneratorContext(options: GeneratorOptions) {
	const config = parseConfig(options.generator.config)

	const context: GeneratorContext = {
		moduleResolution: resolveModuleResolution(options),
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

function resolveModuleResolution(options: GeneratorOptions) {
	const specified = getModuleResolution(options.generator.config)
	if (specified) return specified

	const tsConfigPath = findTsConfig()
	if (!tsConfigPath) return

	try {
		const { compilerOptions } = parse(TsConfig, readTsConfig(tsConfigPath))
		return compilerOptions.moduleResolution
	} catch {
		return
	}
}

const TsConfig = object({
	compilerOptions: object({
		moduleResolution: string(),
	}),
})

function readTsConfig(tsConfigPath: string) {
	return JSON.parse(stripJsonComments(fs.readFileSync(tsConfigPath, 'utf-8')))
}

function findTsConfig() {
	let projectDir = process.cwd()
	while (projectDir !== '/') {
		const tsConfigPath = path.join(projectDir, 'tsconfig.json')
		if (fs.existsSync(tsConfigPath)) return tsConfigPath

		projectDir = path.join(projectDir, '..')
	}
}
