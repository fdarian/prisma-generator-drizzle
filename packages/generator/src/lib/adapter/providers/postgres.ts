import { camelCase, kebabCase } from 'lodash'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { namedImport } from '~/lib/syntaxes/imports'
import { createModule } from '~/lib/syntaxes/module'
import { getDateMode } from '~/shared/date-mode'
import { createAdapter } from '../adapter'
import {
	type CreateFieldInput,
	createField as baseCreateField,
	isDefaultFunc,
} from '../fields/createField'
import type { BigIntMode } from '../fields/directives/custom'
import {
	createPgSchemasModule,
	getPgSchemaImport,
	getPgSchemaVarName,
	isPublicSchema,
} from './pg-schemas'
import { getNativeType, renderColumn } from './native-type'

const coreModule = 'drizzle-orm/pg-core'

const customBytesModule = createModule({
	name: 'custom-bytes',
	declarations: [
		{
			imports: [namedImport(['customType'], coreModule)],
			code: `export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'bytea';
	},
	fromDriver(value: unknown) {
		if (Buffer.isBuffer(value)) return value
		throw new Error('Expected Buffer')
	},
	toDriver(value: Buffer) {
		return value
	}
});`,
		},
	],
})

function createField(input: CreateFieldInput) {
	if (input.field.isList) {
		input.func += '.array()'
	}

	return baseCreateField(input)
}

function createColumn(
	field: SchemaField,
	builder: string,
	options?: Parameters<typeof renderColumn>[2]
) {
	return createField({
		field,
		imports: [namedImport([builder], coreModule)],
		func: renderColumn(builder, getDbName(field), options),
	})
}

export const postgresAdapter = createAdapter({
	name: 'postgres',
	getDeclarationFunc: {
		enum(name, values, schema) {
			const args = `'${name}', [${values.map((v) => `'${v}'`).join(', ')}]`
			if (isPublicSchema(schema)) {
				return {
					imports: [namedImport(['pgEnum'], coreModule)],
					func: `pgEnum(${args})`,
				}
			}
			return {
				imports: [getPgSchemaImport(schema)],
				func: `${getPgSchemaVarName(schema)}.enum(${args})`,
			}
		},
		table(name, fields, schema) {
			const args = `'${name}', { ${fields
				.map((f) => `${f.field.name}: ${f.func}`)
				.join(', ')} }`
			if (isPublicSchema(schema)) {
				return {
					imports: [namedImport(['pgTable'], coreModule)],
					func: `pgTable(${args})`,
				}
			}
			return {
				imports: [getPgSchemaImport(schema)],
				func: `${getPgSchemaVarName(schema)}.table(${args})`,
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
			const func =
				field.hasDefaultValue &&
				isDefaultFunc(field) &&
				field.default.name === 'autoincrement'
					? 'bigserial'
					: 'bigint'

			return createField({
				field,
				imports: [namedImport([func], coreModule)],
				func: (opts: { mode?: BigIntMode }) =>
					`${func}('${getDbName(field)}', { mode: '${opts?.mode ?? 'bigint'}' })`,
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
		// Prisma: https://www.prisma.io/docs/orm/reference/prisma-schema-reference#bytes:~:text=Default%20mapping-,PostgreSQL,-bytea
		Bytes(field) {
			return createField({
				field,
				imports: [namedImport(['customBytes'], `./${customBytesModule.name}`)],
				func: `customBytes('${getDbName(field)}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/pg/#timestamp
		DateTime(field) {
			const mode = `'${getDateMode(field)}'`
			const native = getNativeType(field)

			switch (native?.name) {
				case 'Timestamp':
					return createColumn(field, 'timestamp', {
						mode,
						precision: native.args[0],
					})
				case 'Timestamptz':
					return createColumn(field, 'timestamp', {
						mode,
						precision: native.args[0],
						withTimezone: true,
					})
				case 'Date':
					return createColumn(field, 'date', { mode })
				case 'Time':
					return createColumn(field, 'time', { precision: native.args[0] })
				case 'Timetz':
					return createColumn(field, 'time', {
						precision: native.args[0],
						withTimezone: true,
					})
				default:
					return createColumn(field, 'timestamp', { mode, precision: 3 })
			}
		},
		// https://orm.drizzle.team/docs/column-types/pg/#decimal
		Decimal(field) {
			const native = getNativeType(field)

			if (native?.name === 'Decimal') {
				return createColumn(field, 'decimal', {
					precision: native.args[0],
					scale: native.args[1],
				})
			}
			return createColumn(field, 'decimal', { precision: 65, scale: 30 })
		},
		// https://orm.drizzle.team/docs/column-types/pg/#double-precision
		Float(field) {
			if (getNativeType(field)?.name === 'Real') {
				return createColumn(field, 'real')
			}
			return createColumn(field, 'doublePrecision')
		},
		// https://orm.drizzle.team/docs/column-types/pg/#integer
		Int(field) {
			const isAutoincrement =
				field.hasDefaultValue &&
				isDefaultFunc(field) &&
				field.default.name === 'autoincrement'

			const isSmallInt = getNativeType(field)?.name === 'SmallInt'
			const func = isSmallInt
				? isAutoincrement
					? 'smallserial'
					: 'smallint'
				: isAutoincrement
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
			return createColumn(
				field,
				getNativeType(field)?.name === 'Json' ? 'json' : 'jsonb'
			)
		},
		// https://orm.drizzle.team/docs/column-types/pg/#text
		String(field) {
			const native = getNativeType(field)

			switch (native?.name) {
				case 'VarChar':
					return createColumn(field, 'varchar', { length: native.args[0] })
				case 'Char':
					return createColumn(field, 'char', { length: native.args[0] })
				case 'Uuid':
					return createColumn(field, 'uuid')
				case 'Inet':
					return createColumn(field, 'inet')
				default:
					return createColumn(field, 'text')
			}
		},
	},
	extraModules: [customBytesModule],
	createSchemasModule(schemas) {
		return createPgSchemasModule(coreModule, schemas)
	},
})
