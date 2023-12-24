import fs from 'fs'
import {
  DMMF,
  generatorHandler,
  GeneratorOptions,
} from '@prisma/generator-helper'
import { logger } from '@prisma/sdk'
import path from 'path'
import { GENERATOR_NAME } from './constants'
import { writeFileSafely } from './utils/writeFileSafely'
import pluralize from 'pluralize'
import { camelCase, kebabCase } from 'lodash'
import { v } from './lib/value'
import { createValue, IValue } from './lib/value/createValue'
import { Entry } from './lib/value/types/objectValue'
import { flow, pipe } from 'fp-ts/lib/function'
import { render } from './lib/value/utils'
import { ImportValue } from './lib/value/types/import'
import { Adapter, mysqlAdapter, pgAdapter } from './lib/adapter/adapter'
import { or } from 'fp-ts/lib/Refinement'
import { defineBigint } from './lib/adapter/columns/defineBigint'
import { IColumnValue } from './lib/adapter/base/defineColumn'
import { defineBoolean } from './lib/adapter/columns/defineBoolean'
import { defineDatetime } from './lib/adapter/columns/defineDatetime'
import { defineDecimal } from './lib/adapter/columns/defineDecimal'
import { defineFloat } from './lib/adapter/columns/defineFloat'
import { defineInt } from './lib/adapter/columns/defineInt'
import { defineJson } from './lib/adapter/columns/defineJson'
import { defineString } from './lib/adapter/columns/defineString'
import { defineEnum } from './lib/adapter/columns/defineEnum'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME} Generating drizzle schema...`)
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

    const enumStart = Date.now()
    for await (const eenum of options.dmmf.datamodel.enums) {
      const varName = getEnumVar(eenum.name)

      const imports = v.namedImport([adapter.functions.enum], adapter.module)
      const enumVar = v.defineVar(
        varName,
        adapter.definition.enum.declare(
          eenum.dbName ?? eenum.name,
          eenum.values.map((value) => value.dbName ?? value.name)
        ),
        { export: true }
      )

      const code = `${imports.render()}\n\n${enumVar.render()}`

      const writeLocation = path.join(basePath, `${kebabCase(varName)}.ts`)
      await writeFileSafely(writeLocation, code)
    }
    logger.info(
      `${options.dmmf.datamodel.enums.length} Enums generated in ${
        Date.now() - enumStart
      }ms`
    )

    const modelStart = Date.now()
    const models = []
    for await (const model of options.dmmf.datamodel.models) {
      const name = pluralize(model.name)

      const importMap = new Map<string, Set<string>>()
      const addImport = (modulePath: string, name: string) => {
        const val = importMap.get(modulePath) ?? new Set()
        importMap.set(modulePath, val)
        val.add(name)
      }

      const modelVar = camelCase(name)

      const fields = model.fields
        .filter(pipe(isKind('scalar'), or(isKind('enum'))))
        .map(getField(adapter))

      addImport(adapter.module, adapter.functions.table)
      const modelCode = v
        .defineVar(
          modelVar,
          adapter.table(
            model.name,
            fields.map((field) => [field.field, field])
          ),
          { export: true }
        )
        .render()

      fields.forEach((field) => {
        field.imports.forEach((imp) => {
          addImport(imp.module, imp.name)
        })
      })

      const relationalFields = model.fields.filter(
        (field) => field.kind === 'object'
      )
      const relations = new Set<string>()
      const relationCode = v
        .defineVar(
          `${modelVar}Relations`,
          v.func('relations', [
            v.useVar(modelVar),
            v.lambda(
              v.useVar('helpers'),
              v.object(
                relationalFields.map((field) => {
                  const model = pluralize(field.type)
                  const varName = camelCase(model)
                  relations.add(varName)

                  addImport(`./${kebabCase(model)}`, varName)

                  return [
                    field.name,
                    v.func(field.isList ? 'helpers.many' : 'helpers.one', [
                      v.useVar(varName),
                      ...(field.relationFromFields &&
                      field.relationFromFields.length > 0 &&
                      field.relationToFields &&
                      field.relationToFields.length > 0
                        ? [
                            v.object([
                              [
                                'fields',
                                v.array(
                                  field.relationFromFields.map((f) =>
                                    createValue({
                                      render: () =>
                                        `${modelVar}.${camelCase(f)}`,
                                    })
                                  )
                                ),
                              ],
                              [
                                'references',
                                v.array(
                                  field.relationToFields.map((f) =>
                                    createValue({
                                      render: () =>
                                        `${varName}.${camelCase(f)}`,
                                    })
                                  )
                                ),
                              ],
                            ]),
                          ]
                        : []),
                    ]),
                  ]
                })
              )
            ),
          ]),
          { export: true }
        )
        .render()

      const importCode = [
        ...[...importMap.entries()].map(([modulePath, names]) =>
          v.namedImport([...names], modulePath)
        ),
        v.namedImport(['relations'], 'drizzle-orm'),
      ]
        .map(render)
        .join('\n')

      const code = `${importCode}\n\n${modelCode}\n\n${relationCode}`

      const file = kebabCase(name)
      const writeLocation = path.join(basePath, `${file}.ts`)
      await writeFileSafely(writeLocation, code)

      models.push({
        name: modelVar,
        path: `${file}`,
      })
    }
    logger.info(
      `${options.dmmf.datamodel.enums.length} models generated in ${
        Date.now() - modelStart
      }ms`
    )

    const importCode = models
      .map((m) => v.wilcardImport(m.name, `./${m.path}`))
      .map(render)
      .join('\n')

    const schemaCode = v
      .defineVar('schema', v.object(models.map((m) => v.useVar(m.name))), {
        export: true,
      })
      .render()

    await writeFileSafely(
      path.join(basePath, 'schema.ts'),
      `${importCode}\n\n${schemaCode}`
    )
  },
})

function getAdapter(options: GeneratorOptions) {
  return (() => {
    switch (options.datasources[0].provider) {
      case 'postgres':
      case 'postgresql':
        return pgAdapter
      case 'mysql':
        return mysqlAdapter
      default:
        throw new Error(
          `Connector ${options.datasources[0].provider} is not supported`
        )
    }
  })()
}

function getField(adapter: Adapter) {
  return function (field: DMMF.Field): IColumnValue {
    if (field.kind === 'enum') {
      return defineEnum(adapter, field)
    }

    switch (field.type) {
      case 'BigInt': {
        return defineBigint(adapter, field)
      }
      case 'Boolean': {
        return defineBoolean(adapter, field)
      }
      case 'DateTime': {
        return defineDatetime(adapter, field)
      }
      case 'Decimal': {
        return defineDecimal(adapter, field)
      }
      case 'Float': {
        return defineFloat(adapter, field)
      }
      case 'Int': {
        return defineInt(adapter, field)
      }
      case 'Json': {
        return defineJson(adapter, field)
      }
      case 'String': {
        return defineString(adapter, field)
      }
      default:
        throw new Error(`Type ${field.type} is not supported`)
    }
  }
}

// #region Enum
function getEnumVar(name: string) {
  return `${camelCase(name)}Enum`
}
// #endregion

function isKind(kind: DMMF.FieldKind) {
  return (field: DMMF.Field): field is DMMF.Field => field.kind === kind
}
