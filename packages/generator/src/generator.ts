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
    const basePath = options.generator.output?.value
    if (!basePath) throw new Error('No output path specified')

    fs.existsSync(basePath) && fs.rmSync(basePath, { recursive: true })

    const models = []
    for await (const model of options.dmmf.datamodel.models) {
      const name = pluralize(model.name)

      const fields = model.fields
        .filter((field) => field.kind === 'scalar')
        .map(getField)

      const modelImports = ['pgTable']
      const modelVar = camelCase(name)
      const modelCode = v
        .defineVar(
          modelVar,
          v.func('pgTable', [
            v.string(model.name),
            v.object(fields.map((field) => field.code)),
          ]),
          { export: true }
        )
        .render()

      const drizzleImports = new Set<string>()
      fields.forEach((field) => {
        field.imports.forEach((imp) => drizzleImports.add(imp))
      })
      modelImports.forEach((imp) => drizzleImports.add(imp))

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

      const imports = [
        v.namedImport(['relations'], 'drizzle-orm'),
        v.namedImport(Array.from(drizzleImports), 'drizzle-orm/pg-core'),
        ...Array.from(relations).map((name) =>
          v.namedImport([name], `./${kebabCase(name)}`)
        ),
      ]
        .map(render)
        .join('\n')

      const code = `${imports}\n\n${modelCode}\n\n${relationCode}`

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

function getField(field: DMMF.Field): { imports: string[]; code: Entry } {
  const getEntry = (fieldFuncName: string, args: IValue[] = []): Entry => {
    return [
      field.name,
      pipe(
        v.func(fieldFuncName, [v.string(field.dbName ?? field.name), ...args]),
        (funcValue) => {
          if (!field.isId) return funcValue
          return funcValue.chain(v.func('primaryKey'))
        },
        (funcValue) => {
          if (field.isId || !field.isRequired) return funcValue
          return funcValue.chain(v.func('notNull'))
        }
      ),
    ]
  }

  switch (field.type) {
    case 'BigInt': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bigint
      // https://orm.drizzle.team/docs/column-types/pg/#bigint
      const func = 'bigint'
      return {
        imports: [func],
        code: getEntry(func, [v.object([['mode', v.string('bigint')]])]),
      }
    }
    case 'Boolean': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#boolean
      // https://orm.drizzle.team/docs/column-types/pg/#boolean
      const func = 'boolean'

      return {
        imports: [func],
        code: getEntry(func),
      }
    }
    case 'DateTime': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datetime
      // https://orm.drizzle.team/docs/column-types/pg/#timestamp
      const func = 'timestamp'

      return {
        imports: [func],
        code: getEntry(func, [
          v.object([
            ['precision', v.number(3)],
            ['mode', v.string('date')],
          ]),
        ]),
      }
    }
    case 'Decimal': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
      // https://orm.drizzle.team/docs/column-types/pg/#decimal
      const func = 'decimal'

      return {
        imports: [func],
        code: getEntry(func, [
          v.object([
            ['precision', v.number(65)],
            ['scale', v.number(30)],
          ]),
        ]),
      }
    }
    case 'Float': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#float
      // https://orm.drizzle.team/docs/column-types/pg/#double-precision
      const func = 'doublePrecision'

      return {
        imports: [func],
        code: getEntry(func),
      }
    }
    case 'Int': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#int
      // https://orm.drizzle.team/docs/column-types/pg/#integer
      const func = 'integer'

      return {
        imports: [func],
        code: getEntry(func),
      }
    }
    case 'Json': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#json
      // https://orm.drizzle.team/docs/column-types/pg/#jsonb
      const func = 'jsonb'

      return {
        imports: [func],
        code: getEntry(func),
      }
    }
    case 'String': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#string
      // https://orm.drizzle.team/docs/column-types/pg/#text
      const func = 'text'

      return {
        imports: [func],
        code: getEntry(func),
      }
    }
    default:
      throw new Error(`Type ${field.type} is not supported`)
  }
}
