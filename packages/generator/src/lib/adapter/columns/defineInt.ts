import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#int
export function defineInt(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [{ module: adapter.module, name: adapter.functions.int }],
    columnFunc: v.func(adapter.functions.int),
  })
}
