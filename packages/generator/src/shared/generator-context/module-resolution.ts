import fs from 'node:fs'
import path from 'node:path'
import { brand, object, parse, string, transform } from 'valibot'
import stripJsonComments from '~/lib/strip-json-comments'

export const ModuleResolution = brand(
	transform(string(), (value) => value.toLowerCase()),
	'ModuleResolution'
)

export function resolveModuleResolution() {
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
		moduleResolution: ModuleResolution,
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
