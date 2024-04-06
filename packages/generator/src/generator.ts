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
import type { Context } from './lib/context'
import { logger } from './lib/logger'
import {
	type ImportValue,
	type NamedImport,
	namedImport,
} from './lib/syntaxes/imports'
import type { Module } from './lib/syntaxes/module'
import {
	isRelationalQueryEnabled,
	initializeGenerator,
	getGenerator,
} from './shared/generator-context'
import {
	generateRelationalModules,
	type RelationalModule,
} from './lib/adapter/modules/relational'
import type { BaseGeneratedModules } from './lib/adapter/modules/sets/base-generated-modules'
import { generateImplicitModules } from './lib/adapter/modules/relational'
import type { RelationalModuleSet } from './lib/adapter/modules/relational'
import { generateSchemaModules as generateSchemaModule } from './lib/adapter/modules/relational'

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
		const ctx: Context = {
			adapter,
			datamodel: options.dmmf.datamodel,
		}

		const modules: GeneratedModules = {
			extras: adapter.extraModules,
			enums: generateEnumModules(options, adapter),
			models: generateModelModules(options, ctx),
		}

		if (isRelationalQueryEnabled()) {
			const relational = generateRelationalModules(modules, ctx)
			const implicit = generateImplicitModules(relational, ctx)
			const schema = generateSchemaModule({
				...modules,
				relational: relational,
				implicitModels: implicit.models,
				implicitRelational: implicit.relational,
			})

			modules.schema = schema
			modules.relational = relational
			modules.implicitModels = implicit.models
			modules.implicitRelational = implicit.relational
		}

		writeModules(modules)
		handleFormatting()
	},
})

function handleFormatting() {
	const generator = getGenerator()
	if (generator.config.formatter == null) return

	execSync(`prettier --write ${generator.outputBasePath}`, { stdio: 'inherit' })
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
			reduce(new Map<string, Set<string>>(), (accum, command) => {
				if (command.type !== 'namedImport') return accum

				const imports = new Set(accum.get(command.module))
				for (const name of command.names) {
					imports.add(name)
				}

				return accum.set(command.module, imports)
			}),
			(map) => Array.from(map),
			map(([path, names]) => namedImport(Array.from(names), path))
		),
	]
}

function writeModules(modules: GeneratedModules) {
	const basePath = getGenerator().outputBasePath

	fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })
	fs.mkdirSync(basePath, { recursive: true })

	for (const module of flattenModules(modules)) {
		const writeLocation = path.join(basePath, `${module.name}.ts`)
		fs.writeFileSync(writeLocation, module.code)
	}
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
