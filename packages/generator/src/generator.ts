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
import { isEmpty } from 'lodash'
import { GENERATOR_NAME } from './constants'
import { generateSchemaDeclaration } from './lib/adapter/declarations/generateSchemaDeclaration'
import { generateTableRelationsDeclaration } from './lib/adapter/declarations/generateTableRelationsDeclaration'
import {
	type ModelModule,
	createModelModule,
} from './lib/adapter/modules/createModelModule'
import { generateEnumModules } from './lib/adapter/modules/enums'
import type { Context } from './lib/context'
import { logger } from './lib/logger'
import { isRelationField } from './lib/prisma-helpers/field'
import {
	type ImportValue,
	type NamedImport,
	namedImport,
} from './lib/syntaxes/imports'
import { type Module, createModule } from './lib/syntaxes/module'
import {
	isRelationalQueryEnabled,
	setGeneratorContext,
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
		setGeneratorContext(options)
		logger.applyConfig(options)

		logger.log('Generating drizzle schema...')

		if (options.datasources.length === 0)
			throw new Error('No datasource specified')
		if (options.datasources.length > 1)
			throw new Error('Only one datasource is supported')

		const adapter = await getAdapter(options)
		const ctx: Context = {
			adapter,
			datamodel: options.dmmf.datamodel,
		}

		const basePath = options.generator.output?.value
		if (!basePath) throw new Error('No output path specified')

		fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })
		fs.mkdirSync(basePath, { recursive: true })

		const modules: GeneratedModules = {
			extras: adapter.extraModules,
			enums: generateEnumModules(options, adapter),
			models: options.dmmf.datamodel.models.map((model) =>
				createModelModule({ model, ctx })
			),
		}

		if (isRelationalQueryEnabled()) {
			modules.relational = modules.models.flatMap((modelModule) => {
				const relationalModule = createRelationalModule({ ctx, modelModule })
				if (relationalModule == null) return []
				return relationalModule
			})

			modules.implicitModels = modules.relational
				.flatMap((module) => module.implicit)
				.reduce(deduplicateModels, [] as DMMF.Model[])
				.map((model) => createModelModule({ model, ctx }))

			modules.implicitRelational = modules.implicitModels.flatMap(
				(modelModule) => {
					const relationalModule = createRelationalModule({ ctx, modelModule })
					if (relationalModule == null) return []
					return relationalModule
				}
			)

			modules.schema = createModule({
				name: 'schema',
				declarations: [
					generateSchemaDeclaration([
						...modules.models,
						...modules.relational,
						...modules.implicitModels,
						...modules.implicitRelational,
					]),
				],
			})
		}

		for (const module of flattenModules(modules)) {
			writeModule(basePath, module)
		}

		const formatter = options.generator.config.formatter
		if (formatter === 'prettier') {
			execSync(`prettier --write ${basePath}`, { stdio: 'inherit' })
		}
	},
})

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

function writeModule(basePath: string, module: Module) {
	const writeLocation = path.join(basePath, `${module.name}.ts`)
	fs.writeFileSync(writeLocation, module.code)
}

/**
 * @dev Importing the adapter dynamically so `getGeneratorContext()` won't
 * be called before initialization (`onGenerate`)
 */
async function getAdapter(options: GeneratorOptions) {
	switch (options.datasources[0].provider) {
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
			throw new Error(
				`Connector ${options.datasources[0].provider} is not supported`
			)
	}
}

function deduplicateModels(accum: DMMF.Model[], model: DMMF.Model) {
	if (accum.some(({ name }) => name === model.name)) return accum
	return [...accum, model]
}

function createRelationalModule(input: {
	modelModule: ModelModule
	ctx: Context
}) {
	const { model } = input.modelModule

	const relationalFields = model.fields.filter(isRelationField)
	if (isEmpty(relationalFields)) return undefined

	const declaration = generateTableRelationsDeclaration({
		fields: relationalFields,
		modelModule: input.modelModule,
		datamodel: input.ctx.datamodel,
	})
	return createModule({
		name: `${input.modelModule.name}-relations`,
		declarations: [declaration],
		implicit: declaration.implicit,
	})
}

type RelationalModule = NonNullable<ReturnType<typeof createRelationalModule>>

// #region Generated Modules

type GeneratedModules = {
	extras?: Module[]
	enums: Module[]
	models: ModelModule[]
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
