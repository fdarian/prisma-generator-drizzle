import { pipe } from 'fp-ts/lib/function'
import { v } from '../value'
import { map } from 'fp-ts/Array'
import { Entry } from '../value/types/objectValue'
import { IValue } from '../value/createValue'

function createAdapter(input: {
  module: string
  functions: {
    enum: string
    table: string
    int: string
    float: string
    json: string
    bigint?: string
    boolean?: string
    datetime: string
    decimal?: string
    string?: string
  }
  definition: {
    datetime: { opts: Record<string, IValue> }
  }
}) {
  const functions = {
    ...input.functions,
    // https://orm.drizzle.team/docs/column-types/pg/#bigint
    bigint: input.functions.bigint ?? 'bigint',
    // https://orm.drizzle.team/docs/column-types/pg/#boolean
    boolean: input.functions.boolean ?? 'boolean',
    // https://orm.drizzle.team/docs/column-types/pg/#decimal
    decimal: input.functions.decimal ?? 'decimal',
    // https://orm.drizzle.team/docs/column-types/pg/#text
    string: input.functions.string ?? 'text',
  }

  return {
    module: input.module,
    functions,
    definition: input.definition,
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
    // https://orm.drizzle.team/docs/column-types/pg/#jsonb
    json: 'jsonb',
    // https://orm.drizzle.team/docs/column-types/pg/#timestamp
    datetime: 'timestamp',
  },
  definition: {
    datetime: {
      opts: {
        precision: v.number(3),
      },
    },
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
    // https://orm.drizzle.team/docs/column-types/mysql#json
    json: 'json',
    // https://orm.drizzle.team/docs/column-types/mysql#datetime
    datetime: 'datetime',
  },
  definition: {
    datetime: {
      opts: {
        fsp: v.number(3),
      },
    },
  },
})
