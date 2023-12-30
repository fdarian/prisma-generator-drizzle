import { DMMF } from '@prisma/generator-helper'
import { ImportValue, namedImport } from '~/lib/syntaxes/imports'

export type DefineImport = {
  module: string
  name: string
}

interface CreateFieldInput {
  field: DMMF.Field
  imports?: ImportValue[]
  func: string
}

export type FieldFunc = ReturnType<typeof createField>

export function createField(input: CreateFieldInput) {
  const { field } = input

  let imports = input.imports ?? []

  let func = `${input.func}`
  if (field.isId) func += '.primaryKey()'
  else if (field.isRequired) func += '.notNull()'

  // .type<...>()
  const customType = getCustomType(field)
  if (customType) {
    imports = imports.concat(customType.imports)
    func += customType.code
  }

  return {
    imports,
    field,
    name: field.name,
    func: func,
  }
}

function getCustomType(field: DMMF.Field) {
  if (
    field.documentation == null ||
    !field.documentation.startsWith('drizzle.type ')
  )
    return

  const splits = field.documentation
    .replaceAll('drizzle.type', '')
    .trim()
    .split('::')

  if (splits.length !== 2)
    throw new Error(`Invalid type definition: ${field.documentation}`)

  const [module, type] = splits
  return {
    imports: namedImport([type], module),
    code: `.type<${type}>()`,
  }
}
