import {
  DMMF,
  generatorHandler,
  GeneratorOptions,
} from '@prisma/generator-helper'
import { flatMap, map, reduce } from 'fp-ts/lib/Array'
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
import { Adapter } from './lib/adapter/types'
import { createDef, ImportableDefinition } from './lib/definitions/createDef'
import {
  ImportValue,
  namedImport,
  NamedImport,
} from './lib/definitions/types/imports'
import { render } from './lib/definitions/utils'
import { logger } from './lib/logger'
import { getEnumModuleName } from './lib/prisma-helpers/enums'
import { isRelationField } from './lib/prisma-helpers/field'
import { getModelModuleName } from './lib/prisma-helpers/model'
import { writeFileSafely } from './utils/writeFileSafely'

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

    const basePath = options.generator.output?.value
    if (!basePath) throw new Error('No output path specified')

    fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })

    for await (const prismaEnum of options.dmmf.datamodel.enums) {
      const enumCreation = logger.createTask()

      const enumModule = createModule({
        name: getEnumModuleName(prismaEnum),
        declarations: [generateEnumDeclaration(adapter, prismaEnum)],
      })
      await writeModule(basePath, enumModule)

      enumCreation.end(`◟ ${enumModule.name}.ts`)
    }

    const models: ModelModule[] = []
    for await (const model of options.dmmf.datamodel.models) {
      const modelCreation = logger.createTask()

      const modelModule = createModelModule({
        adapter,
        model,
        datamodel: options.dmmf.datamodel,
      })
      await writeModule(basePath, modelModule)

      models.push(modelModule)

      modelCreation.end(`◟ ${modelModule.name}.ts`)
    }

    const schemaModule = createModule({
      name: 'schema',
      declarations: [generateSchemaDeclaration(models)],
    })
    await writeModule(basePath, schemaModule)
  },
})

function reduceImports(imports: ImportValue[]) {
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

async function writeModule(basePath: string, module: Module) {
  const writeLocation = path.join(basePath, `${module.name}.ts`)
  await writeFileSafely(writeLocation, module.render())
}

function getAdapter(options: GeneratorOptions) {
  return (() => {
    switch (options.datasources[0].provider) {
      case 'postgres':
      case 'postgresql':
        return postgresAdapter
      case 'mysql':
        return mysqlAdapter
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

function createModule(input: {
  declarations: ImportableDefinition[]
  name: string
}) {
  return createDef({
    name: input.name,
    render() {
      const imports = pipe(
        input.declarations,
        flatMap((d) => d.imports),
        reduceImports
      )

      return [
        imports.map(render).join('\n'),
        ...input.declarations.map(render),
      ].join('\n\n')
    },
  })
}
type Module = ReturnType<typeof createModule>

function createModelModule(input: {
  model: DMMF.Model
  datamodel: DMMF.Datamodel
  adapter: Adapter
}) {
  const tableVar = generateTableDeclaration(input.adapter, input.model)

  const relationalFields = input.model.fields.filter(isRelationField)
  const relationsVar = isEmpty(relationalFields)
    ? null
    : generateTableRelationsDeclaration({
        tableVarName: tableVar.name,
        fields: relationalFields,
        datamodel: input.datamodel,
      })

  return createModule({
    name: getModelModuleName(input.model),
    declarations: [tableVar, ...ifExists(relationsVar)],
  })
}
export type ModelModule = ReturnType<typeof createModelModule>
