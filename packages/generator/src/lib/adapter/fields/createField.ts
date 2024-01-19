import { DMMF } from '@prisma/generator-helper'
import { ImportValue, namedImport } from '~/lib/syntaxes/imports'
import { MakeRequired, ModifyType, Prettify } from '~/lib/types/utils'

export type DefineImport = {
  module: string
  name: string
}

interface CreateFieldInput {
  field: DMMF.Field
  imports?: ImportValue[]
  func: string
  onDefault?: (field: FieldWithDefault) => string
}

export type FieldFunc = ReturnType<typeof createField>

export function createField(input: CreateFieldInput) {
  const { field } = input

  let imports = input.imports ?? []

  let func = `${input.func}`

  // .type<...>()
  const customType = getCustomType(field)
  if (customType) {
    imports = imports.concat(customType.imports)
    func += customType.code
  }

  const customDefault = getCustomDefault(field)
  if (customDefault) {
    imports = imports.concat(customDefault.imports)
    func += customDefault.code
  } else if (field.hasDefaultValue) {
    const _onDefault = input.onDefault ?? onDefault
    func += _onDefault(field as FieldWithDefault)
  }

  if (field.isId) func += '.primaryKey()'
  else if (field.isRequired || field.hasDefaultValue || !!customDefault)
    func += '.notNull()'

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

function getCustomDefault(field: DMMF.Field) {
  if (
    field.documentation == null ||
    !field.documentation.startsWith('drizzle.default ')
  )
    return

  const splits = field.documentation
    .replaceAll('drizzle.default', '')
    .trim()
    .split('::')

  if (splits.length !== 2)
    throw new Error(`Invalid default definition: ${field.documentation}`)

  const [module, _secondFragment] = splits

  const splits2 = _secondFragment.split('`').map((s) => s.trim())
  if (splits2.length === 1) {
    const [type] = splits2
    return {
      imports: namedImport([type], module),
      code: `.$defaultFn(() => ${type}())`,
    }
  } else if (splits2.length !== 3)
    throw new Error(`Invalid default definition: ${field.documentation}`)

  const [type, code] = splits2
  return {
    imports: namedImport([type], module),
    code: `.$defaultFn(${code})`,
  }
}

// #region onDefault
type FieldWithDefault = Prettify<MakeRequired<DMMF.Field, 'default'>>

function isDefaultScalar(
  field: FieldWithDefault
): field is Prettify<
  ModifyType<FieldWithDefault, 'default', DMMF.FieldDefaultScalar>
> {
  return typeof field.default !== 'object'
}

function isDefaultFunc(
  field: FieldWithDefault
): field is Prettify<
  ModifyType<FieldWithDefault, 'default', DMMF.FieldDefault>
> {
  return typeof field.default === 'object' && !Array.isArray(field.default)
}

function isDefaultScalarList(
  field: FieldWithDefault
): field is Prettify<
  ModifyType<FieldWithDefault, 'default', DMMF.FieldDefaultScalar[]>
> {
  return Array.isArray(field.default)
}

function onDefault(field: FieldWithDefault) {
  if (isDefaultScalar(field)) {
    let def = ''

    if (field.kind === 'enum') {
      def = `'${field.default}'`
    } else {
      switch (field.type) {
        case 'BigInt':
          def = `BigInt(${field.default})`
          break
        case 'Int':
        case 'Float':
        case 'Boolean':
        case 'Json':
          def = `${field.default}`
          break
        case 'Decimal':
        case 'String':
          def = `'${field.default}'`
          break
        default:
          console.warn(
            `Unsupported default value: ${JSON.stringify(
              field.default
            )} on field ${field.name}`
          )
          return ''
      }
    }

    return `.default(${def})`
  }

  console.warn(
    `Unsupported default value: ${JSON.stringify(field.default)} on field ${
      field.name
    }`
  )
  return ''
}
// #endregion
