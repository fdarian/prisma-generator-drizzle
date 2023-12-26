import { DMMF } from '@prisma/generator-helper'
import { namedImport } from 'src/lib/value/types/import'
import { Adapter } from '../adapter'
import { defineColumn } from '../base/defineColumn'
import { fieldFunc } from './fieldFunc'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#string
export function defineString(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [namedImport([adapter.functions.string], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.string, field),
  })
}
