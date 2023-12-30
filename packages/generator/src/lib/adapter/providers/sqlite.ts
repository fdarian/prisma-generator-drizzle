import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { namedImport } from '~/lib/syntaxes/imports'
import { createAdapter } from '../adapter'
import { createField } from '../fields/createField'

const coreModule = 'drizzle-orm/sqlite-core'
export const sqliteAdapter = createAdapter({
  name: 'sqlite',
  getDeclarationFunc: {
    enum(_, __) {
      throw new Error('Prisma does not support enums')
    },
    table(name, fields) {
      return {
        imports: [namedImport(['sqliteTable'], coreModule)],
        func: `sqliteTable('${name}', { ${fields
          .map(({ field, func }) => `${field.name}: ${func}`)
          .join(', ')} })`,
      }
    },
  },
  fields: {
    // Prisma: https://arc.net/l/quote/omrfeqos
    // Drizzle: https://orm.drizzle.team/docs/column-types/sqlite#bigint
    BigInt(field) {
      return createField({
        field,
        imports: [namedImport(['blob'], coreModule)],
        func: `blob('${getDbName(field)}', { mode: 'bigint' })`,
      })
    },
    // Prisma: https://arc.net/l/quote/jurqgcxd
    // Drizzle: https://arc.net/l/quote/pxcgbjxz
    Boolean(field) {
      return createField({
        field,
        imports: [namedImport(['integer'], coreModule)],
        func: `integer('${getDbName(field)}', { mode: 'boolean' })`,
      })
    },
    // Prisma: https://arc.net/l/quote/grwnsumx
    // Drizzle: https://arc.net/l/quote/fpupjigo
    DateTime(field) {
      return createField({
        field,
        imports: [namedImport(['integer'], coreModule)],
        func: `integer('${getDbName(field)}', { mode: 'timestamp' })`,
      })
    },
    // TODO
    // https://arc.net/l/quote/sgkjrpxh
    // Decimal(field) {
    //   return createField({
    //     field,
    //     imports: [namedImport(['decimal'], coreModule)],
    //     func: `decimal('${getDbName(field)}', { precision: 65, scale: 30 })`,
    //   })
    // },
    // Prisma: https://arc.net/l/quote/ozmbgwfq
    // Drizzle: https://orm.drizzle.team/docs/column-types/sqlite#real
    Float(field) {
      return createField({
        field,
        imports: [namedImport(['real'], coreModule)],
        func: `real('${getDbName(field)}')`,
      })
    },
    // Prisma: https://arc.net/l/quote/rwenryvc
    // Drizzle: https://orm.drizzle.team/docs/column-types/sqlite#integer
    Int(field) {
      return createField({
        field,
        imports: [namedImport(['integer'], coreModule)],
        func: `integer('${getDbName(field)}', { mode: 'number' })`,
      })
    },
    // Prisma: https://arc.net/l/quote/bddbqrja
    // Drizzle: https://orm.drizzle.team/docs/column-types/sqlite#text
    String(field) {
      return createField({
        field,
        imports: [namedImport(['text'], coreModule)],
        func: `text('${getDbName(field)}')`,
      })
    },
  },
})
