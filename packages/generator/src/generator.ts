import {
  DMMF,
  generatorHandler,
  GeneratorOptions,
} from '@prisma/generator-helper'
import { execSync } from 'child_process'
import { map, reduce } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import fs from 'fs'
import { isEmpty } from 'lodash'
import path from 'path'
import { GENERATOR_NAME } from './constants'
import { generateEnumDeclaration } from './lib/adapter/declarations/generateEnumDeclaration'
import { generateSchemaDeclaration } from './lib/adapter/declarations/generateSchemaDeclaration'
import { generateTableRelationsDeclaration } from './lib/adapter/declarations/generateTableRelationsDeclaration'
import {
  createModelModule,
  ModelModule,
} from './lib/adapter/modules/createModelModule'
import { mysqlAdapter } from './lib/adapter/providers/mysql'
import { postgresAdapter } from './lib/adapter/providers/postgres'
import { sqliteAdapter } from './lib/adapter/providers/sqlite'
import { isRelationalQueryEnabled } from './lib/config'
import { Context } from './lib/context'
import { logger } from './lib/logger'
import { getEnumModuleName } from './lib/prisma-helpers/enums'
import { isRelationField } from './lib/prisma-helpers/field'
import { ImportValue, namedImport, NamedImport } from './lib/syntaxes/imports'
import { createModule, Module } from './lib/syntaxes/module'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    logger.log('Generating drizzle schema...')
    return {
      version,
      defaultOutput: './drizzle',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    if (options.datasources.length === 0)
      throw new Error('No datasource specified')
    if (options.datasources.length > 1)
      throw new Error('Only one datasource is supported')

    const adapter = getAdapter(options)
    const ctx: Context = {
      adapter,
      config: options.generator.config,
      datamodel: options.dmmf.datamodel,
    }

    const basePath = options.generator.output?.value
    if (!basePath) throw new Error('No output path specified')

    fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })
    fs.mkdirSync(basePath, { recursive: true })

    adapter.extraModules?.forEach((module) => {
      const moduleCreation = logger.createTask()
      writeModule(basePath, module)
      moduleCreation.end(`◟ ${module.name}.ts`)
    })

    options.dmmf.datamodel.enums.forEach((prismaEnum) => {
      const enumCreation = logger.createTask()

      const enumModule = createModule({
        name: getEnumModuleName(prismaEnum),
        declarations: [generateEnumDeclaration(adapter, prismaEnum)],
      })
      writeModule(basePath, enumModule)

      enumCreation.end(`◟ ${enumModule.name}.ts`)
      return enumModule
    })

    const modelModules = options.dmmf.datamodel.models.map((model) => {
      const modelCreation = logger.createTask()

      const modelModule = createModelModule({ model, ctx })
      writeModule(basePath, modelModule)

      modelCreation.end(`◟ ${modelModule.name}.ts`)

      return modelModule
    })

    if (isRelationalQueryEnabled(options.generator.config)) {
      const relationalModules = modelModules.flatMap((modelModule) => {
        const creation = logger.createTask()

        const relationalModule = createRelationalModule({ ctx, modelModule })
        if (relationalModule == null) return []

        writeModule(basePath, relationalModule)

        creation.end(`◟ ${relationalModule.name}.ts`)
        return relationalModule
      })

      const implicitModelModules = relationalModules
        .flatMap((module) => module.implicit)
        .reduce(deduplicateModels, [] as DMMF.Model[])
        .map((model) => {
          const modelCreation = logger.createTask()

          const modelModule = createModelModule({ model, ctx })
          writeModule(basePath, modelModule)

          modelCreation.end(`◟ ${modelModule.name}.ts`)
          return modelModule
        })
      const implicitRelationalModules = implicitModelModules.flatMap(
        (modelModule) => {
          const creation = logger.createTask()

          const relationalModule = createRelationalModule({ ctx, modelModule })
          if (relationalModule == null) return []

          writeModule(basePath, relationalModule)

          creation.end(`◟ ${relationalModule.name}.ts`)
          return relationalModule
        }
      )

      const schemaModule = createModule({
        name: 'schema',
        declarations: [
          generateSchemaDeclaration([
            ...modelModules,
            ...relationalModules,
            ...implicitModelModules,
            ...implicitRelationalModules,
          ]),
        ],
      })
      writeModule(basePath, schemaModule)
    }

    const formatter = options.generator.config['formatter']
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
        command.names.forEach((name) => imports.add(name))

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

function getAdapter(options: GeneratorOptions) {
  return (() => {
    switch (options.datasources[0].provider) {
      case 'cockroachdb': // CockroahDB should be postgres compatible
      case 'postgres':
      case 'postgresql':
        return postgresAdapter
      case 'mysql':
        return mysqlAdapter
      case 'sqlite':
        return sqliteAdapter
      default:
        throw new Error(
          `Connector ${options.datasources[0].provider} is not supported`
        )
    }
  })()
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
