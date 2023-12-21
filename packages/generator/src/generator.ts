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
import { pipe } from 'fp-ts/lib/function'
import { render } from './lib/value/utils'
import { ImportValue } from './lib/value/types/import'
import { Adapter, mysqlAdapter, pgAdapter } from './lib/adapter'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`)
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

    const adapter = (() => {
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

    const basePath = options.generator.output?.value
    if (!basePath) throw new Error('No output path specified')

    fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })

    for await (const eenum of options.dmmf.datamodel.enums) {
      const varName = getEnumVar(eenum.name)

      const imports = v.namedImport([adapter.functions.enum], adapter.module)
      const enumVar = v.defineVar(
        varName,
        adapter.enum(
          eenum.dbName ?? eenum.name,
          eenum.values.map((value) => value.dbName ?? value.name)
        ),
        { export: true }
      )

      const code = `${imports.render()}\n\n${enumVar.render()}`

      const writeLocation = path.join(basePath, `${kebabCase(varName)}.ts`)
      await writeFileSafely(writeLocation, code)
    }

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
        .filter((field) => field.kind === 'scalar' || field.kind === 'enum')
        .map(getField(adapter))

      addImport(adapter.module, adapter.functions.table)
      const modelCode = v
        .defineVar(
          modelVar,
          adapter.table(
            model.name,
            fields.map((field) => field.code)
          ),
          { export: true }
        )
        .render()

      const imports: ImportValue[] = []

      fields.forEach((field) => {
        field.imports.forEach((imp) => {
          imp.names.forEach((name) => addImport(imp.modulePath, name))
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
                  const varName = camelCase(pluralize(field.type))
                  relations.add(varName)

                  addImport(`./${kebabCase(name)}`, name)

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

type IImportValue = { names: string[]; modulePath: string }
function getField(adapter: Adapter) {
  return function (field: DMMF.Field): {
    imports: IImportValue[]
    code: Entry
  } {
    const getEntry = (
      fieldFuncName: string,
      args: IValue[] = []
    ): [string, { imports: IImportValue[]; func: IValue }] => {
      return [
        field.name,
        pipe(
          {
            imports: [] as IImportValue[],
            func: v.func(fieldFuncName, [
              v.string(field.dbName ?? field.name),
              ...args,
            ]),
          },
          (obj) => {
            if (field.documentation) {
              const typeDef = field.documentation?.startsWith('drizzle.type ')
              if (typeDef) {
                const splits = field.documentation
                  .replaceAll('drizzle.type', '')
                  .trim()
                  .split('::')
                if (splits.length !== 2)
                  throw new Error(
                    `Invalid type definition: ${field.documentation}`
                  )
                const [modulePath, type] = splits
                return {
                  imports: [...obj.imports, { names: [type], modulePath }],
                  func: obj.func.chain(v.func('$type', [], { type })),
                }
              }
            }
            return obj
          },
          (obj) => {
            if (!field.isId) return obj
            return {
              ...obj,
              func: obj.func.chain(v.func('primaryKey')),
            }
          },
          (obj) => {
            if (field.isId || !field.isRequired) return obj
            return {
              ...obj,
              func: obj.func.chain(v.func('notNull')),
            }
          }
        ),
      ]
    }

    if (field.kind === 'enum') {
      const enumVar = getEnumVar(field.type)
      const [name, a] = getEntry(enumVar)
      return {
        imports: [
          ...a.imports,
          { names: [enumVar], modulePath: `./${kebabCase(enumVar)}` },
        ],
        code: [name, a.func],
      }
    }

    switch (field.type) {
      case 'BigInt': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bigint
        // https://orm.drizzle.team/docs/column-types/pg/#bigint
        const func = 'bigint'

        const [name, a] = getEntry(func, [
          v.object([['mode', v.string('bigint')]]),
        ])
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'Boolean': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#boolean
        // https://orm.drizzle.team/docs/column-types/pg/#boolean
        const func = 'boolean'

        const [name, a] = getEntry(func)
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'DateTime': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datetime
        // https://orm.drizzle.team/docs/column-types/pg/#timestamp
        const func = 'timestamp'
        const [name, a] = getEntry(func, [
          v.object([
            ['precision', v.number(3)],
            ['mode', v.string('date')],
          ]),
        ])

        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'Decimal': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
        // https://orm.drizzle.team/docs/column-types/pg/#decimal
        const func = 'decimal'
        const [name, a] = getEntry(func, [
          v.object([
            ['precision', v.number(65)],
            ['scale', v.number(30)],
          ]),
        ])

        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'Float': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#float
        // https://orm.drizzle.team/docs/column-types/pg/#double-precision
        const func = 'doublePrecision'
        const [name, a] = getEntry(func)
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'Int': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#int

        // https://orm.drizzle.team/docs/column-types/pg/#integer
        // https://orm.drizzle.team/docs/column-types/mysql#integer
        const func = adapter.functions.int
        const [name, a] = getEntry(func)
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'Json': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#json
        // https://orm.drizzle.team/docs/column-types/pg/#jsonb
        const func = 'jsonb'
        const [name, a] = getEntry(func)
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
      }
      case 'String': {
        // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#string
        // https://orm.drizzle.team/docs/column-types/pg/#text
        const func = 'text'
        const [name, a] = getEntry(func)
        return {
          imports: [
            ...a.imports,
            { names: [func], modulePath: adapter.module },
          ],
          code: [name, a.func],
        }
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
