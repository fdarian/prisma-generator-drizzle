import { pipe } from 'fp-ts/lib/function'
import { v } from './value'
import { map } from 'fp-ts/Array'
import { Entry } from './value/types/objectValue'

function createAdapter(input: {
  module: string
  functions: {
    enum: string
    table: string
  }
}) {
  return {
    module: input.module,
    functions: input.functions,
    enum(name: string, values: string[]) {
      return v.func(input.functions.enum, [
        v.string(name),
        v.array(pipe(values, map(v.string))),
      ])
    },
    table(name: string, fields: Entry[]) {
      return v.func(input.functions.table, [v.string(name), v.object(fields)])
    },
  }
}
export type Adapter = ReturnType<typeof createAdapter>

export const pgAdapter = createAdapter({
  module: 'drizzle-orm/pg-core',
  functions: {
    enum: 'pgEnum',
    table: 'pgTable',
  },
})

export const mysqlAdapter = createAdapter({
  module: 'drizzle-orm/mysql-core',
  functions: {
    enum: 'mysqlEnum',
    table: 'mysqlTable',
  },
})
