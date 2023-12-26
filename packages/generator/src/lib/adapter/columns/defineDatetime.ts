import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { defineColumn } from '../base/defineColumn'
import { Adapter } from '../adapter'
import { fieldFunc } from './fieldFunc'
import { namedImport } from 'src/lib/value/types/import'

// https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datetime
export function defineDatetime(adapter: Adapter, field: DMMF.Field) {
  return defineColumn({
    field,
    adapter,
    imports: [namedImport([adapter.functions.datetime], adapter.module)],
    columnFunc: fieldFunc(adapter.functions.datetime, field, {
      ...adapter.definition.datetime.opts,
      mode: v.string('date'),
    }),
  })
}
