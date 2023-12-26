import { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase } from 'lodash'
import { namedImport } from 'src/lib/value/types/import'
import { Adapter } from '../adapter'
import { defineColumn } from '../base/defineColumn'
import { fieldFunc } from './fieldFunc'

export function defineEnum(adapter: Adapter, field: DMMF.Field) {
  const func = `${camelCase(field.type)}Enum`

  return defineColumn({
    field,
    adapter,
    imports: [namedImport([func], `./${kebabCase(field.type)}-enum`)],
    columnFunc: fieldFunc(func, field),
  })
}
