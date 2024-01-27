import path from 'path'
import fs from 'fs'

type GeneratorContext = {
	moduleResolution: string
}

let generatorContext_: GeneratorContext | undefined

export function getGeneratorContext() {
	if (generatorContext_ == null) {
		generatorContext_ = {
			moduleResolution: resolveModuleResolution(),
		}
	}
	return generatorContext_
}

function resolveModuleResolution() {
	const tsConfig = readTsConfig()
	const moduleResolution = tsConfig?.compilerOptions?.moduleResolution
	if (moduleResolution == null) {
		throw new Error('Could not resolve module resolution')
	}
	return moduleResolution
}

function readTsConfig() {
	const tsConfigPath = path.join(process.cwd(), 'tsconfig.json')
	if (!fs.existsSync(tsConfigPath)) return

	const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'))
	return tsConfig
}
