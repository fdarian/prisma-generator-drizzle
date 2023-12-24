import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datetime
export function defineDatetime(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [{ module: adapter.module, name: adapter.functions.datetime }],
    columnFunc: v.func(adapter.functions.datetime, [
      v.object({
        precision: v.number(3),
        model: v.string('date'),
      }),
    ]),
  })
}
