import { pipe } from 'fp-ts/lib/function'
import { v } from '../value'
import { map } from 'fp-ts/Array'
import { Entry } from '../value/types/objectValue'

function createAdapter(input: {
  module: string
  functions: {
    enum: string
    table: string
    int: string
    float: string
    bigint?: string
    boolean?: string
    datetime?: string
    decimal?: string
    json?: string
    string?: string
  }
}) {
  const functions = {
    ...input.functions,
    // https://orm.drizzle.team/docs/column-types/pg/#bigint
    bigint: input.functions.bigint ?? 'bigint',
    // https://orm.drizzle.team/docs/column-types/pg/#boolean
    boolean: input.functions.boolean ?? 'boolean',
    // https://orm.drizzle.team/docs/column-types/pg/#timestamp
    datetime: input.functions.datetime ?? 'timestamp',
    // https://orm.drizzle.team/docs/column-types/pg/#decimal
    decimal: input.functions.decimal ?? 'decimal',
    // https://orm.drizzle.team/docs/column-types/pg/#jsonb
    json: input.functions.json ?? 'jsonb',
    // https://orm.drizzle.team/docs/column-types/pg/#text
    string: input.functions.string ?? 'text',
  }

  return {
    module: input.module,
    functions,
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
    // https://orm.drizzle.team/docs/column-types/pg/#integer
    int: 'integer',
    // https://orm.drizzle.team/docs/column-types/pg/#double-precision
    float: 'doublePrecision',
  },
})

export const mysqlAdapter = createAdapter({
  module: 'drizzle-orm/mysql-core',
  functions: {
    enum: 'mysqlEnum',
    table: 'mysqlTable',
    // https://orm.drizzle.team/docs/column-types/mysql#integer
    int: 'int',
    // https://orm.drizzle.team/docs/column-types/mysql#float
    float: 'float',
  },
})
