import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
	type DMMF,
	type GeneratorOptions,
	generatorHandler,
} from '@prisma/generator-helper'
import { map, reduce } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { GENERATOR_NAME } from './constants'
import { generateEnumModules } from './lib/adapter/modules/enums'
import {
	type ModelModule,
	generateModelModules,
} from './lib/adapter/modules/model'
import {
	type RelationalModule,
	generateRelationalModules,
} from './lib/adapter/modules/relational'
import { generateImplicitModules } from './lib/adapter/modules/relational'
import type { RelationalModuleSet } from './lib/adapter/modules/relational'
import { generateSchemaModules as generateSchemaModule } from './lib/adapter/modules/relational'
import type { BaseGeneratedModules } from './lib/adapter/modules/sets/base-generated-modules'
import { logger } from './lib/logger'
import {
	type ImportValue,
	type NamedImport,
	namedImport,
} from './lib/syntaxes/imports'
import { type Module, createModule } from './lib/syntaxes/module'
import {
	getGenerator,
	initializeGenerator,
	isRelationalQueryEnabled,
} from './shared/generator-context'

const { version } = require('../package.json')

generatorHandler({
	onManifest() {
		return {
			version,
			defaultOutput: './drizzle',
			prettyName: GENERATOR_NAME,
		}
	},
	onGenerate: async (options: GeneratorOptions) => {
		initializeGenerator(options)

		logger.log('Generating drizzle schema...')

		const adapter = await getAdapter(options)

		const modules: GeneratedModules = {
			extras: adapter.extraModules,
			enums: generateEnumModules(adapter),
			models: generateModelModules(adapter),
		}

		if (isRelationalQueryEnabled()) {
			const relational = generateRelationalModules(modules.models)
			modules.relational = relational

			const implicit = generateImplicitModules(adapter, relational)
			modules.implicitModels = implicit.models
			modules.implicitRelational = implicit.relational

			if (!getGenerator().output.isSingleFile) {
				const schema = generateSchemaModule({
					...modules,
					relational: relational,
					implicitModels: implicit.models,
					implicitRelational: implicit.relational,
				})
				modules.schema = schema
			}
		}

		writeModules(modules)
		handleFormatting()
	},
})

function handleFormatting() {
	const generator = getGenerator()
	if (generator.config.formatter == null) return
	switch (generator.config.formatter) {
		case 'prettier':
			execSync(`prettier --write ${generator.output.path}`, {
				stdio: 'inherit',
			})
			break
		case 'biome':
			execSync(`biome format --write ${generator.output.path}`, {
				stdio: 'inherit',
			})
			break
		default:
			execSync(`${generator.config.formatter} ${generator.output.path}`, {
				stdio: 'inherit',
			})
	}
}

export function reduceImports(imports: ImportValue[]) {
	type Plan = { toReduce: NamedImport[]; skipped: ImportValue[] }

	const plan = pipe(
		imports,
		reduce({ toReduce: [], skipped: [] } as Plan, (plan, command) => {
			if (command.type === 'namedImport') {
				plan.toReduce.push(command)
			} else {
				plan.skipped.push(command)
			}
			return plan
		})
	)

	return [
		...plan.skipped,
		...pipe(
			plan.toReduce,
			reduce(new Map<ModuleKey, Set<string>>(), (accum, import_) => {
				if (import_.type !== 'namedImport') return accum

				const imports = new Set(accum.get(getModuleKey(import_)))
				for (const name of import_.names) {
					imports.add(name)
				}

				return accum.set(getModuleKey(import_), imports)
			}),
			(map) => Array.from(map),
			map(([key, names]) =>
				namedImport(
					Array.from(names),
					parseModuleKey(key),
					isTypeModuleKey(key)
				)
			)
		),
	]
}

type ModuleKey = string & { _type: 'ModuleKey' }
function getModuleKey(import_: ImportValue) {
	if (import_.isTypeImport) return `$type${import_.module}` as ModuleKey
	return import_.module as ModuleKey
}
function isTypeModuleKey(name: ModuleKey) {
	return name.includes('$type')
}
function parseModuleKey(name: ModuleKey) {
	return name.replace('$type', '')
}

function writeModules(modules: GeneratedModules) {
	const outputPath = getGenerator().output.path

	if (getGenerator().output.isSingleFile) {
		if (hasSubFolder(outputPath)) {
			fs.mkdirSync(getParentPath(outputPath), { recursive: true })
		}

		fs.writeFileSync(outputPath, createDrizzleModule(modules).code)
		return
	}

	fs.existsSync(outputPath) && fs.rmSync(outputPath, { recursive: true })
	fs.mkdirSync(outputPath, { recursive: true })

	for (const module of flattenModules(modules)) {
		const writeLocation = path.join(outputPath, `${module.name}.ts`)
		fs.writeFileSync(writeLocation, module.code)
	}
}

function getParentPath(output: string) {
	return output.split('/').slice(0, -1).join('/')
}

function hasSubFolder(output: string) {
	return output.split('/').length > 1
}

/**
 * A single file output module where it contains
 * all schema definitions and its relations
 */
function createDrizzleModule(modules: GeneratedModules) {
	return createModule({
		name: getSingleOutputFileName(),
		declarations: flattenModules(modules).flatMap((module) =>
			module.declarations.map((declaration) => {
				return {
					...declaration,
					imports: declaration.imports.filter(
						(i) => !i.module.startsWith('./')
					),
				}
			})
		),
	})
}

function getSingleOutputFileName() {
	const lastSegment = getGenerator().output.path.split('/').at(-1)
	if (lastSegment == null) {
		throw new Error('Last segment is undefined')
	}
	return lastSegment.replace('.ts', '')
}

/**
 * @dev Importing the adapter dynamically so `getGeneratorContext()` won't
 * be called before initialization (`onGenerate`)
 */
async function getAdapter(options: GeneratorOptions) {
	if (options.datasources.length === 0)
		throw new Error('No datasource specified')
	if (options.datasources.length > 1)
		throw new Error('Only one datasource is supported')

	const provider = options.datasources[0].provider
	switch (provider) {
		case 'cockroachdb': // CockroahDB should be postgres compatible
		case 'postgres':
		case 'postgresql': {
			const mod = await import('./lib/adapter/providers/postgres')
			return mod.postgresAdapter
		}
		case 'mysql': {
			const mod = await import('./lib/adapter/providers/mysql')
			return mod.mysqlAdapter
		}
		case 'sqlite': {
			const mod = await import('./lib/adapter/providers/sqlite')
			return mod.sqliteAdapter
		}
		default:
			throw new Error(`Connector ${provider} is not supported`)
	}
}

export function deduplicateModels(accum: DMMF.Model[], model: DMMF.Model) {
	if (accum.some(({ name }) => name === model.name)) return accum
	return [...accum, model]
}

export type GeneratedModules = BaseGeneratedModules &
	Partial<RelationalModuleSet> & {
		relational?: RelationalModule[]
		implicitModels?: ModelModule[]
		implicitRelational?: Module[]
		schema?: Module
	}
export function flattenModules(modules: GeneratedModules) {
	const { schema, ...rest } = modules
	return [
		schema,
		...Object.values(rest) //
			.flatMap((mod) => mod), //
	].filter((module): module is Module => module != null)
}

// #endregion
