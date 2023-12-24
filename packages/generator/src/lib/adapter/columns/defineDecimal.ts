import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
export function defineDecimal(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [{ module: adapter.module, name: adapter.functions.decimal }],
    columnFunc: v.func(adapter.functions.decimal, [
      v.object({
        precision: v.number(65),
        scale: v.number(30),
      }),
    ]),
  })
}
