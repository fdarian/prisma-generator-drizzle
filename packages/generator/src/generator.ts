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
import { camel, dash } from 'radash'
import { camelCase, kebabCase } from 'lodash'
import { render } from './lib/value/utils'
import { v } from './lib/value'
import { IValue } from './lib/value/createValue'

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

    for await (const model of options.dmmf.datamodel.models) {
      const name = pluralize(model.name)

      const fields = model.fields
        .filter((field) => field.kind === 'scalar')
        .map(getField)

      const modelImports = ['pgTable']
      const modelCode = `export const ${camelCase(name)} = pgTable('${
        model.name
      }', {${fields.map((field) => field.code).join(', ')}});`

      const imports = new Set()
      fields.forEach((field) => {
        field.imports.forEach((imp) => imports.add(imp))
      })
      modelImports.forEach((imp) => imports.add(imp))

      const importCode = `import { ${Array.from(imports).join(
        ', '
      )} } from 'drizzle-orm/pg-core'`

      const code = `${importCode}\n\n${modelCode}`

      const writeLocation = path.join(basePath, `${kebabCase(name)}.ts`)
      await writeFileSafely(writeLocation, code)
    }
  },
})

function getField(field: DMMF.Field) {
  const renderBaseFunc = (fieldFuncName: string, args: IValue[] = []) => {
    return `${field.name}: ${v
      .func(fieldFuncName, [v.string(field.dbName ?? field.name), ...args])
      .render()}`
  }

  switch (field.type) {
    case 'BigInt': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bigint
      // https://orm.drizzle.team/docs/column-types/pg/#bigint
      const func = 'bigint'
      return {
        imports: [func],
        code: renderBaseFunc(func),
      }
    }
    case 'Boolean': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#boolean
      // https://orm.drizzle.team/docs/column-types/pg/#boolean
      const func = 'boolean'

      return {
        imports: [func],
        code: renderBaseFunc(func),
      }
    }
    case 'DateTime': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datetime
      // https://orm.drizzle.team/docs/column-types/pg/#timestamp
      const func = 'timestamp'

      return {
        imports: [func],
        code: renderBaseFunc(func, [
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
        code: renderBaseFunc(func, [
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
        code: renderBaseFunc(func),
      }
    }
    case 'Int': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#int
      // https://orm.drizzle.team/docs/column-types/pg/#integer
      const func = 'integer'

      return {
        imports: [func],
        code: renderBaseFunc(func),
      }
    }
    case 'Json': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#json
      // https://orm.drizzle.team/docs/column-types/pg/#jsonb
      const func = 'jsonb'

      return {
        imports: [func],
        code: renderBaseFunc(func),
      }
    }
    case 'String': {
      // https://www.prisma.io/docs/orm/reference/prisma-schema-reference#string
      // https://orm.drizzle.team/docs/column-types/pg/#text
      const func = 'text'

      return {
        imports: [func],
        code: renderBaseFunc(func),
      }
    }
    default:
      throw new Error(`Type ${field.type} is not supported`)
  }
}

function breakPascal(name: string) {
  return (
    // https://stackoverflow.com/a/4149393
    name
      // insert a space before all caps
      .replace(/([A-Z])/g, ' $1')
      // uppercase the first character
      .replace(/^./, function (str) {
        return str.toUpperCase()
      })
  )
}
