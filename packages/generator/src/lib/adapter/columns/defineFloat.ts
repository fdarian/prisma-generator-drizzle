import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'
import { fieldFunc } from './fieldFunc'
import { v } from 'src/lib/value'
import { namedImport } from 'src/lib/value/types/import'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#float
export function defineFloat(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [namedImport([adapter.functions.float], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.float, field),
  })
}
