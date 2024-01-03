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
import { generateTableDeclaration } from './lib/adapter/declarations/generateTableDeclaration'
import { generateTableRelationsDeclaration } from './lib/adapter/declarations/generateTableRelationsDeclaration'
import { mysqlAdapter } from './lib/adapter/providers/mysql'
import { postgresAdapter } from './lib/adapter/providers/postgres'
import { sqliteAdapter } from './lib/adapter/providers/sqlite'
import { isRelationalQueryEnabled } from './lib/config'
import { Context } from './lib/context'
import { logger } from './lib/logger'
import { getEnumModuleName } from './lib/prisma-helpers/enums'
import { isRelationField } from './lib/prisma-helpers/field'
import { getModelModuleName } from './lib/prisma-helpers/model'
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

    let modelModules = options.dmmf.datamodel.models.map((model) => {
      const modelCreation = logger.createTask()

      const modelModule = createModelModule({ model, ctx })
      writeModule(basePath, modelModule)

      modelCreation.end(`◟ ${modelModule.name}.ts`)

      return modelModule
    })

    const implicitModelModules = modelModules
      .flatMap((module) => module.implicit)
      .reduce(deduplicateModels, [] as DMMF.Model[])
      .map((model) => {
        const modelCreation = logger.createTask()

        const modelModule = createModelModule({ model, ctx })
        writeModule(basePath, modelModule)

        modelCreation.end(`◟ ${modelModule.name}.ts`)
        return modelModule
      })
    modelModules = modelModules.concat(implicitModelModules)

    if (isRelationalQueryEnabled(options.generator.config)) {
      const schemaModule = createModule({
        name: 'schema',
        declarations: [generateSchemaDeclaration(modelModules)],
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

function ifExists<T>(value: T | null | undefined): T[] {
  if (value == null) return []
  return [value]
}

function createModelModule(input: { model: DMMF.Model; ctx: Context }) {
  const tableVar = generateTableDeclaration(input.ctx.adapter, input.model)

  const relationsVar = (() => {
    if (!isRelationalQueryEnabled(input.ctx.config)) return null

    const relationalFields = input.model.fields.filter(isRelationField)
    if (isEmpty(relationalFields)) return null

    return generateTableRelationsDeclaration({
      model: input.model,
      tableVarName: tableVar.name,
      fields: relationalFields,
      datamodel: input.ctx.datamodel,
    })
  })()

  return createModule({
    name: getModelModuleName(input.model),
    implicit: relationsVar?.implicit ?? [],
    declarations: [tableVar, ...ifExists(relationsVar)],
  })
}
export type ModelModule = ReturnType<typeof createModelModule>

function deduplicateModels(accum: DMMF.Model[], model: DMMF.Model) {
  if (accum.some(({ name }) => name === model.name)) return accum
  return [...accum, model]
}
