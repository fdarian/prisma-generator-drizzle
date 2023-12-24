import { pipe } from 'fp-ts/lib/function'
import { v } from '../value'
import { map } from 'fp-ts/Array'
import { Entry } from '../value/types/objectValue'
import { IValue } from '../value/createValue'
import { args } from '../value/types/lambdaValue'

function createAdapter<TName extends string>(input: {
  name: TName
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
    enum: { declare(name: string, values: string[]): IValue }
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
    name: input.name,
    module: input.module,
    functions,
    definition: input.definition,
    table(name: string, fields: Entry[]) {
      return v.func(input.functions.table, [v.string(name), v.object(fields)])
    },
  }
}

const pgFunctions = {
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
}

export const pgAdapter = createAdapter({
  name: 'postgres',
  module: 'drizzle-orm/pg-core',
  functions: pgFunctions,
  definition: {
    enum: {
      declare(name: string, values: string[]) {
        return v.func(pgFunctions.enum, [
          v.string(name),
          v.array(pipe(values, map(v.string))),
        ])
      },
    },
    datetime: {
      opts: {
        precision: v.number(3),
      },
    },
  },
})

const mysqlFunctions = {
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
}

export const mysqlAdapter = createAdapter({
  name: 'mysql',
  module: 'drizzle-orm/mysql-core',
  functions: mysqlFunctions,
  definition: {
    enum: {
      declare(_name: string, values: string[]) {
        return v.lambda(
          args('name', 'string'),
          v.func(mysqlFunctions.enum, [
            v.useVar('name'),
            v.array(pipe(values, map(v.string))),
          ])
        )
      },
    },
    datetime: {
      opts: {
        fsp: v.number(3),
      },
    },
  },
})

export type Adapter = typeof pgAdapter | typeof mysqlAdapter
