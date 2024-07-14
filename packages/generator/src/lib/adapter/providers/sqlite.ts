import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { namedImport } from '~/lib/syntaxes/imports'
import { createModule } from '~/lib/syntaxes/module'
import { getDateMode } from '~/shared/date-mode'
import { createAdapter } from '../adapter'
import { createField, isDefaultFunc } from '../fields/createField'

const coreModule = 'drizzle-orm/sqlite-core'

const customDecimalModule = createModule({
	name: 'custom-decimal',
	declarations: [
		{
			imports: [namedImport(['customType'], coreModule)],
			code: `export const customDecimal = customType<{ data: string }>(
  {
    dataType() {
      return 'DECIMAL';
    },
    fromDriver(value: unknown) {
      return String(value)
    },
    toDriver(value: string) {
      return Number(value)
    },
  },
);`,
		},
	],
})

const customBigIntModule = createModule({
	name: 'custom-bigint',
	declarations: [
		{
			imports: [namedImport(['customType'], coreModule)],
			code: `export const customBigInt = customType<{ data: bigint }>(
  {
    dataType() {
      return 'INTEGER';
    },
    fromDriver(value: unknown): bigint {
      if (typeof value !== 'number') {
        throw new Error('Expected number type for INTEGER')
      }
      return BigInt(value);
    },
    toDriver(value: bigint): number {
      return Number(value);
    }
  },
);`,
		},
	],
})

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
				imports: [
					namedImport(['customBigInt'], `./${customBigIntModule.name}`),
				],
				func: `customBigInt('${getDbName(field)}')`,
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
		Bytes(field) {
			return createField({
				field,
				imports: [namedImport(['blob'], coreModule)],
				func: `blob('${getDbName(field)}', { mode: 'buffer' })`,
			})
		},
		// Prisma: https://arc.net/l/quote/grwnsumx
		// Drizzle: https://arc.net/l/quote/fpupjigo
		DateTime(field) {
			if (getDateMode(field) !== 'date') {
				throw new Error('Only dateMode `date` is supported for sqlite')
			}

			return createField({
				field,
				imports: [namedImport(['integer'], coreModule)],
				func: `integer('${getDbName(field)}', { mode: 'timestamp' })`, // biome-ignore format: keep one line
			})
		},
		// Prisma: https://arc.net/l/quote/sgkjrpxh
		// Drizzle: ..customized below using drizzle's `customType`..
		Decimal(field) {
			return createField({
				field,
				imports: [
					namedImport(['customDecimal'], `./${customDecimalModule.name}`),
				],
				func: `customDecimal('${getDbName(field)}')`,
			})
		},
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
				onPrimaryKey(field) {
					if (
						field.hasDefaultValue &&
						isDefaultFunc(field) &&
						field.default.name === 'autoincrement'
					)
						return '.primaryKey({ autoIncrement: true })'
				},
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
	extraModules: [customDecimalModule, customBigIntModule],
})
