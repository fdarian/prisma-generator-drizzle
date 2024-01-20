import { camelCase, kebabCase } from 'lodash'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { namedImport } from '~/lib/syntaxes/imports'
import { createAdapter } from '../adapter'
import { createField, hasDefault, isDefaultFunc } from '../fields/createField'

const coreModule = 'drizzle-orm/mysql-core'
export const mysqlAdapter = createAdapter({
	name: 'mysql',
	getDeclarationFunc: {
		enum(_, values) {
			return {
				imports: [namedImport(['mysqlEnum'], coreModule)],
				func: `(fieldName: string) => mysqlEnum(fieldName, [${values
					.map((v) => `'${v}'`)
					.join(', ')}])`,
			}
		},
		table(name, fields) {
			return {
				imports: [namedImport(['mysqlTable'], coreModule)],
				func: `mysqlTable('${name}', { ${fields
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
		// https://orm.drizzle.team/docs/column-types/mysql/#bigint
		BigInt(field) {
			return createField({
				field,
				imports: [namedImport(['bigint'], coreModule)],
				func: `bigint('${getDbName(field)}', { mode: 'bigint' })`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#boolean
		Boolean(field) {
			return createField({
				field,
				imports: [namedImport(['boolean'], coreModule)],
				func: `boolean('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql#datetime
		DateTime(field) {
			const hasDefaultNow =
				hasDefault(field) &&
				isDefaultFunc(field) &&
				field.default.name === 'now'

			return createField({
				field,
				imports: [
					namedImport(['datetime'], coreModule),
					...(hasDefaultNow ? [namedImport(['sql'], 'drizzle-orm')] : []),
				],
				func: `datetime('${getDbName(field)}', { mode: 'date', fsp: 3 })`,
				// https://github.com/drizzle-team/drizzle-orm/issues/921
				onDefault: (field) => {
					if (hasDefaultNow) {
						return `.default(sql\`CURRENT_TIMESTAMP(3)\`)`
					}

					// Drizzle doesn't respect the timezone, different on postgres
					// Might be caused by https://github.com/drizzle-team/drizzle-orm/issues/1442
					if (field.type === 'DateTime') {
						return `.$defaultFn(() => new Date('${field.default}'))`
					}
				},
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#decimal
		Decimal(field) {
			return createField({
				field,
				imports: [namedImport(['decimal'], coreModule)],
				func: `decimal('${getDbName(field)}', { precision: 65, scale: 30 })`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#float
		Float(field) {
			return createField({
				field,
				imports: [namedImport(['float'], coreModule)],
				func: `float('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql#integer
		Int(field) {
			return createField({
				field,
				imports: [namedImport(['int'], coreModule)],
				func: `int('${getDbName(field)}')`,
				onDefault(field) {
					if (
						field.isId &&
						isDefaultFunc(field) &&
						field.default.name === 'autoincrement'
					) {
						return `.autoincrement()`
					}
				},
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql#json
		Json(field) {
			return createField({
				field,
				imports: [namedImport(['json'], coreModule)],
				func: `json('${getDbName(field)}')`,
				onDefault: (field) => `.$defaultFn(() => (${field.default}))`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#text
		String(field) {
			return createField({
				field,
				imports: [namedImport(['text'], coreModule)],
				func: `text('${getDbName(field)}')`,
			})
		},
	},
})
