import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#string
export function defineString(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [{ module: adapter.module, name: adapter.functions.string }],
    columnFunc: v.func(adapter.functions.string),
  })
}
