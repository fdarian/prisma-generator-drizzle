import { DMMF } from '@prisma/generator-helper'
import { namedImport } from 'src/lib/value/types/import'
import { v } from '../../value'
import { Adapter } from '../adapter'
import { defineColumn } from '../base/defineColumn'
import { fieldFunc } from './fieldFunc'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bigint
export function defineBigint(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [namedImport([adapter.functions.bigint], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.bigint, field, {
      mode: v.string('bigint'),
    }),
  })
}
