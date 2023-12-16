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

    options.dmmf.datamodel.models.forEach(async function (model) {
      const name = pluralize(model.name.toLowerCase())

      const fields = model.fields.map(getField)

      const modelImports = ['pgTable']
      const modelCode = `export const ${name} = pgTable('${
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

      const writeLocation = path.join(basePath, `${name}.ts`)
      await writeFileSafely(writeLocation, code)
    })
  },
})

function getField(field: DMMF.Field) {
  const fieldFunc = getFieldType(field.type)
  return {
    imports: [fieldFunc],
    code: `${field.name}: ${fieldFunc}('${field.dbName ?? field.name}')`,
  }
}

function getFieldType(type: string) {
  switch (type) {
    case 'BigInt':
      return 'bigint'
    case 'Boolean':
      return 'boolean'
    case 'DateTime':
      return 'timestamp'
    case 'Decimal':
      return 'decimal'
    case 'Float':
      return 'real'
    case 'Int':
      return 'integer'
    case 'JSON':
      return 'json'
    case 'String':
      return 'text'
    default:
      throw new Error(`Type ${type} is not supported`)
  }
}
