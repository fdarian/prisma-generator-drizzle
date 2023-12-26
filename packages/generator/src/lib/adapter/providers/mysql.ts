import { map } from 'fp-ts/Array'
import { pipe } from 'fp-ts/lib/function'
import { camelCase, kebabCase } from 'lodash'
import { createDef } from '~/lib/definitions/createDef'
import { namedImport } from '~/lib/definitions/types/imports'
import { object } from '~/lib/definitions/types/object'
import { useVar } from '~/lib/definitions/types/useVar'
import { array } from '../../definitions/types/array'
import { funcCall } from '../../definitions/types/funcCall'
import { args, lambda } from '../../definitions/types/lambda'
import { number } from '../../definitions/types/number'
import { string } from '../../definitions/types/string'
import { createAdapter } from '../adapter'
import { createField } from '../fields/createField'
import { fieldFuncCall } from '../fields/fieldFuncCall'

const coreModule = 'drizzle-orm/mysql-core'
export const mysqlAdapter = createAdapter({
  name: 'mysql',
  getDeclarationFunc: {
    enum(_, values) {
      return createDef({
        imports: [namedImport(['mysqlEnum'], coreModule)],
        render: lambda(
          args('fieldName', 'string'),
          funcCall('mysqlEnum', [
            useVar('fieldName'),
            array(pipe(values, map(string))),
          ])
        ),
      })
    },
    table(name, fields) {
      return createDef({
        imports: [namedImport(['mysqlTable'], coreModule)],
        render: funcCall('mysqlTable', [
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
    // https://orm.drizzle.team/docs/column-types/mysql/#bigint
    BigInt(field) {
      return createField({
        field,
        imports: [namedImport(['bigint'], coreModule)],
        func: fieldFuncCall('bigint', field, { mode: string('bigint') }),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql/#boolean
    Boolean(field) {
      return createField({
        field,
        imports: [namedImport(['boolean'], coreModule)],
        func: fieldFuncCall('boolean', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql#datetime
    DateTime(field) {
      return createField({
        field,
        imports: [namedImport(['datetime'], coreModule)],
        func: fieldFuncCall('datetime', field, {
          mode: string('date'),
          fsp: number(3),
        }),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql/#decimal
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
    // https://orm.drizzle.team/docs/column-types/mysql/#float
    Float(field) {
      return createField({
        field,
        imports: [namedImport(['float'], coreModule)],
        func: fieldFuncCall('float', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql#integer
    Int(field) {
      return createField({
        field,
        imports: [namedImport(['int'], coreModule)],
        func: fieldFuncCall('int', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql#json
    Json(field) {
      return createField({
        field,
        imports: [namedImport(['json'], coreModule)],
        func: fieldFuncCall('json', field),
      })
    },
    // https://orm.drizzle.team/docs/column-types/mysql/#text
    String(field) {
      return createField({
        field,
        imports: [namedImport(['text'], coreModule)],
        func: fieldFuncCall('text', field),
      })
    },
  },
})
