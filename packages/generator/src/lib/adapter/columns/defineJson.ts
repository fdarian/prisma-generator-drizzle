import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'
import { fieldFunc } from './fieldFunc'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#json
export function defineJson(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [v.namedImport([adapter.functions.json], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.json, field),
  })
}
