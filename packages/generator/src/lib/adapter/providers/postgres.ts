import { map } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { camelCase, kebabCase } from 'lodash'
import { createDef } from '~/lib/definitions/createDef'
import { array } from '~/lib/definitions/types/array'
import { funcCall } from '~/lib/definitions/types/funcCall'
import { namedImport } from '~/lib/definitions/types/imports'
import { object } from '~/lib/definitions/types/object'
import { number } from '../../definitions/types/number'
import { string } from '../../definitions/types/string'
import { createAdapter } from '../adapter'
import { createField } from '../fields/createField'
import { fieldFuncCall } from '../fields/fieldFuncCall'

const coreModule = 'drizzle-orm/pg-core'
export const postgresAdapter = createAdapter({
  name: 'postgres',
  getDeclarationFunc: {
    enum(name, values) {
      return createDef({
        imports: [namedImport(['pgEnum'], coreModule)],
        render: funcCall('pgEnum', [
          string(name),
          array(pipe(values, map(string))),
        ]),
      })
    },
    table(name, fields) {
      return createDef({
        imports: [namedImport(['pgTable'], coreModule)],
        render: funcCall('pgTable', [
          string(name),
          object(fields.map((field) => [field.name, field])),
        ]),
      })
    },
  },
  fields: {
    enum(field) {
      const func = `${camelCase(field.type)}Enum`
      return createField({
        field,
        imports: [namedImport([func], `./${kebabCase(field.type)}-enum`)],
        func: fieldFuncCall(func, field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#bigint
    BigInt(field) {
      return createField({
        field,
        imports: [namedImport(['bigint'], coreModule)],
        func: fieldFuncCall('bigint', field, {
          mode: string('bigint'),
        }),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#boolean
    Boolean(field) {
      return createField({
        field,
        imports: [namedImport(['boolean'], coreModule)],
        func: fieldFuncCall('boolean', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#timestamp
    DateTime(field) {
      return createField({
        field,
        imports: [namedImport(['timestamp'], coreModule)],
        func: fieldFuncCall('timestamp', field, {
          mode: string('date'),
          precision: number(3),
        }),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#decimal
    Decimal(field) {
      return createField({
        field,
        imports: [namedImport(['decimal'], coreModule)],
        func: fieldFuncCall('decimal', field, {
          precision: number(65),
          scale: number(30),
        }),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#double-precision
    Float(field) {
      return createField({
        field,
        imports: [namedImport(['doublePrecision'], coreModule)],
        func: fieldFuncCall('doublePrecision', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#integer
    Int(field) {
      return createField({
        field,
        imports: [namedImport(['integer'], coreModule)],
        func: fieldFuncCall('integer', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#jsonb
    Json(field) {
      return createField({
        field,
        imports: [namedImport(['jsonb'], coreModule)],
        func: fieldFuncCall('jsonb', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/pg/#text
    String(field) {
      return createField({
        field,
        imports: [namedImport(['text'], coreModule)],
        func: fieldFuncCall('text', field),
      })
    },
  },
})
