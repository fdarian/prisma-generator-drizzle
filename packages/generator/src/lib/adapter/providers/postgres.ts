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
import { getNativeType, onTimeDefault, renderColumn } from './native-type'
import {
	createPgSchemasModule,
	getPgSchemaImport,
	getPgSchemaVarName,
	isPublicSchema,
} from './pg-schemas'
import { createTableExtraConfig } from '../tableExtraConfig'

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
	if (!input.field.isList) return baseCreateField(input)

	const func = input.func
	return baseCreateField({
		...input,
		func:
			typeof func === 'string'
				? `${func}.array()`
				: (opts) => `${func(opts)}.array()`,
	})
}

function createColumn(
	field: SchemaField,
	builder: string,
	options?: Parameters<typeof renderColumn>[2],
	onDefault?: CreateFieldInput['onDefault'],
	onUpdatedAt?: CreateFieldInput['onUpdatedAt']
) {
	return createField({
		field,
		imports: [namedImport([builder], coreModule)],
		func: renderColumn(builder, getDbName(field), options),
		onDefault,
		onUpdatedAt,
	})
}

// A DATE/TIME column wants only its own part of the ISO string. `time` has no
// mode (drizzle always types it as a string), and a `timetz` value without an
// offset would be read in the session timezone rather than as UTC.
const timeOfDay = 'new Date().toISOString().slice(11, 23)'
const stringModeUpdatedAt: Record<string, string> = {
	date: 'new Date().toISOString().slice(0, 10)',
}

function getUpdatedAtExpression(
	field: SchemaField,
	builder: string,
	withTimezone?: boolean
) {
	if (builder === 'time') {
		return withTimezone ? `${timeOfDay} + '+00'` : timeOfDay
	}
	if (getDateMode(field) === 'string') return stringModeUpdatedAt[builder]
}

export const postgresAdapter = createAdapter({
	name: 'postgres',
	coreModule,
	anyColumnType: 'AnyPgColumn',
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
		table(name, fields, schema, extraConfigEntries) {
			const extraConfig = createTableExtraConfig({
				coreModule,
				extraConfigValueType: 'PgTableExtraConfigValue',
				entries: extraConfigEntries,
			})
			const args = `'${name}', { ${fields
				.map((f) => `${f.field.name}: ${f.func}`)
				.join(', ')} }${extraConfig.code}`
			if (isPublicSchema(schema)) {
				return {
					imports: [namedImport(['pgTable'], coreModule), ...extraConfig.imports],
					func: `pgTable(${args})`,
				}
			}
			return {
				imports: [getPgSchemaImport(schema), ...extraConfig.imports],
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
					return createColumn(field, 'date', { mode }, undefined, () =>
						getUpdatedAtExpression(field, 'date')
					)
				case 'Time':
					return createColumn(
						field,
						'time',
						{ precision: native.args[0] },
						(field) => onTimeDefault(field, false),
						() => getUpdatedAtExpression(field, 'time')
					)
				case 'Timetz':
					return createColumn(
						field,
						'time',
						{ precision: native.args[0], withTimezone: true },
						(field) => onTimeDefault(field, true),
						() => getUpdatedAtExpression(field, 'time', true)
					)
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
