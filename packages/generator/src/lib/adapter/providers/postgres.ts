import { camelCase, kebabCase } from 'lodash'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { namedImport } from '~/lib/syntaxes/imports'
import { createAdapter } from '../adapter'
import { createField, hasDefault, isDefaultFunc } from '../fields/createField'

const coreModule = 'drizzle-orm/pg-core'
export const postgresAdapter = createAdapter({
	name: 'postgres',
	getDeclarationFunc: {
		enum(name, values) {
			return {
				imports: [namedImport(['pgEnum'], coreModule)],
				func: `pgEnum('${name}', [${values.map((v) => `'${v}'`).join(', ')}])`,
			}
		},
		table(name, fields) {
			return {
				imports: [namedImport(['pgTable'], coreModule)],
				func: `pgTable('${name}', { ${fields
					.map(({ field, func }) => `${field.name}: ${func}`)
					.join(', ')} })`,
			}
		},
	},
	fields: {
		enum(field) {
			const func = `${camelCase(field.type)}Enum`
			return createField({
				field,
				imports: [namedImport([func], `./${kebabCase(field.type)}-enum`)],
				func: `${func}('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#bigint
		BigInt(field) {
			return createField({
				field,
				imports: [namedImport(['bigint'], coreModule)],
				func: `bigint('${getDbName(field)}', { mode: 'bigint' })`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#boolean
		Boolean(field) {
			return createField({
				field,
				imports: [namedImport(['boolean'], coreModule)],
				func: `boolean('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#timestamp
		DateTime(field) {
			return createField({
				field,
				imports: [namedImport(['timestamp'], coreModule)],
				func: `timestamp('${getDbName(
					field
				)}', { mode: 'date', precision: 3 })`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#decimal
		Decimal(field) {
			return createField({
				field,
				imports: [namedImport(['decimal'], coreModule)],
				func: `decimal('${getDbName(field)}', { precision: 65, scale: 30 })`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#double-precision
		Float(field) {
			return createField({
				field,
				imports: [namedImport(['doublePrecision'], coreModule)],
				func: `doublePrecision('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#integer
		Int(field) {
			const func =
				hasDefault(field) &&
				isDefaultFunc(field) &&
				field.default.name === 'autoincrement'
					? // https://arc.net/l/quote/mpimqrfn
					  'serial'
					: 'integer'

			return createField({
				field,
				imports: [namedImport([func], coreModule)],
				func: `${func}('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#jsonb
		Json(field) {
			return createField({
				field,
				imports: [namedImport(['jsonb'], coreModule)],
				func: `jsonb('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#text
		String(field) {
			return createField({
				field,
				imports: [namedImport(['text'], coreModule)],
				func: `text('${getDbName(field)}')`,
			})
		},
	},
})
