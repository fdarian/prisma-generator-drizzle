import fs from 'node:fs'
import path from 'node:path'
import {
	brand,
	object,
	optional,
	parse,
	pipe,
	string,
	toLowerCase,
} from 'valibot'
import stripJsonComments from '~/lib/strip-json-comments'

export const ModuleResolution = pipe(
	string(),
	toLowerCase(),
	brand('ModuleResolution')
)

export function resolveModuleResolution() {
	const tsConfigPath = findTsConfig()
	if (!tsConfigPath) return

	try {
		const tsConfig = parse(TsConfig, readTsConfig(tsConfigPath))
		return (
			tsConfig.compilerOptions.moduleResolution ??
			getModuleResolutionFromModule(tsConfig.compilerOptions.module)
		)
	} catch {
		return
	}
}

/** TypeScript infers `moduleResolution` from `module` when it isn't set */
function getModuleResolutionFromModule(module: string | undefined) {
	switch (module) {
		case 'node16':
			return 'node16'
		case 'nodenext':
		case 'node18':
		case 'node20':
			return 'nodenext'
	}
}
const TsConfig = object({
	compilerOptions: object({
		moduleResolution: optional(ModuleResolution),
		module: optional(pipe(string(), toLowerCase())),
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
