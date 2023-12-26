import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'
import { camelCase, kebabCase } from 'lodash'
import { fieldFunc } from './fieldFunc'

export function defineEnum(adapter: Adapter, field: DMMF.Field) {
  const func = `${camelCase(field.type)}Enum`

  return defineColumn({
    field,
    adapter,
    imports: [v.namedImport([func], `./${kebabCase(field.type)}-enum`)],
    columnFunc: fieldFunc(func, field),
  })
}
