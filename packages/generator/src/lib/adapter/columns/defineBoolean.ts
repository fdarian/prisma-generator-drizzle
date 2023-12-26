import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'
import { fieldFunc } from './fieldFunc'
import { namedImport } from 'src/lib/value/types/import'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#boolean
export function defineBoolean(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [namedImport([adapter.functions.boolean], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.boolean, field),
  })
}
