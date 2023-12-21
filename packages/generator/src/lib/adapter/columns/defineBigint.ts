import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bigint
export function defineBigint(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [{ module: adapter.module, name: adapter.functions.bigint }],
    columnFunc: v.func(adapter.functions.bigint, [
      // https://orm.drizzle.team/docs/column-types/pg/#bigint
      v.object({ mode: v.string('bigint') }),
    ]),
  })
}
