import { camelCase, kebabCase } from 'lodash'
import type { SchemaField } from '~/lib/prisma-helpers/schema/schema-field'
import { namedImport } from '~/lib/syntaxes/imports'
import { createModule } from '~/lib/syntaxes/module'
import { getDateMode } from '~/shared/date-mode'
import { createAdapter } from '../adapter'
import {
	type CreateFieldInput,
	createField,
	isDefaultFunc,
} from '../fields/createField'
import type { BigIntMode } from '../fields/directives/custom'
import { createTableExtraConfig } from '../tableExtraConfig'
import { getNativeType, onTimeDefault, renderColumn } from './native-type'

const coreModule = 'drizzle-orm/mysql-core'

const customBytesModule = createModule({
	name: 'custom-bytes',
	declarations: [
		{
			imports: [namedImport(['customType'], coreModule)],
			code: `export const customBytes = customType<{ data: Buffer }>({
	dataType() {
		return 'LONGBLOB';
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
		func: renderColumn(builder, field.getDbName(), options),
		onDefault,
		onUpdatedAt,
	})
}

// MySQL rejects the `Z` suffix of an ISO string in DATETIME/TIMESTAMP values,
// and a DATE/TIME column wants only its own part of it
const stringModeUpdatedAt: Record<string, string> = {
	datetime: "new Date().toISOString().replace('T', ' ').replace('Z', '')",
	timestamp: "new Date().toISOString().replace('T', ' ').replace('Z', '')",
	date: 'new Date().toISOString().slice(0, 10)',
}

function getUpdatedAtExpression(field: SchemaField, builder: string) {
	// `time` has no mode: drizzle always types it as a string
	if (builder === 'time') return 'new Date().toISOString().slice(11, 23)'
	if (getDateMode(field) === 'string') return stringModeUpdatedAt[builder]
}

function currentExpression(keyword: string, fsp?: number) {
	return fsp === undefined ? keyword : `${keyword}(${fsp})`
}

function createDateTimeColumn(
	field: SchemaField,
	builder: string,
	options: { mode?: string; fsp?: number },
	nowExpression = currentExpression('CURRENT_TIMESTAMP', options.fsp),
	onLiteralDefault?: CreateFieldInput['onDefault']
) {
	return createColumn(
		field,
		builder,
		options,
		(field) => {
			// https://github.com/drizzle-team/drizzle-orm/issues/921
			if (
				field.hasDefaultValue &&
				isDefaultFunc(field) &&
				field.default.name === 'now'
			) {
				return {
					imports: [namedImport(['sql'], 'drizzle-orm')],
					code: `.default(sql\`${nowExpression}\`)`,
				}
			}

			const literal = onLiteralDefault?.(field)
			if (literal) return literal

			// Drizzle doesn't respect the timezone, different on postgres
			// Might be caused by https://github.com/drizzle-team/drizzle-orm/issues/1442
			if (field.type === 'DateTime') {
				return {
					code: `.$defaultFn(() => new Date('${field.default}'))`,
				}
			}
		},
		() => getUpdatedAtExpression(field, builder)
	)
}

const intColumns: Record<string, { builder: string; unsigned?: true }> = {
	UnsignedInt: { builder: 'int', unsigned: true },
	SmallInt: { builder: 'smallint' },
	UnsignedSmallInt: { builder: 'smallint', unsigned: true },
	MediumInt: { builder: 'mediumint' },
	UnsignedMediumInt: { builder: 'mediumint', unsigned: true },
	TinyInt: { builder: 'tinyint' },
	UnsignedTinyInt: { builder: 'tinyint', unsigned: true },
	Year: { builder: 'year' },
}

const onAutoincrementDefault: CreateFieldInput['onDefault'] = (field) => {
	if (
		field.isId &&
		isDefaultFunc(field) &&
		field.default.name === 'autoincrement'
	) {
		return {
			code: '.autoincrement()',
		}
	}
}

export const mysqlAdapter = createAdapter({
	name: 'mysql',
	coreModule,
	maxIdentifierLength: 64,
	createsForeignKeysBeforeUniqueIndexes: false,
	indexFeatures: {
		operatorClass: false,
		sortOrder: false,
		method: false,
		primaryKeyName: false,
		implicitJoinTableKey: 'unique',
	},
	getDeclarationFunc: {
		enum(_, values) {
			return {
				imports: [namedImport(['mysqlEnum'], coreModule)],
				func: `(fieldName: string) => mysqlEnum(fieldName, [${values
					.map((v) => `'${v}'`)
					.join(', ')}])`,
			}
		},
		table(name, fields, _schema, extraConfigEntries) {
			const extraConfig = createTableExtraConfig({
				coreModule,
				extraConfigValueType: 'MySqlTableExtraConfigValue',
				entries: extraConfigEntries,
			})
			return {
				imports: [
					namedImport(['mysqlTable'], coreModule),
					...extraConfig.imports,
				],
				func: `mysqlTable('${name}', { ${fields
					.map(({ field, func }) => `${field.name}: ${func}`)
					.join(', ')} }${extraConfig.code})`,
			}
		},
	},
	fields: {
		enum(field) {
			const func = `${camelCase(field.type)}Enum`
			return createField({
				field,
				imports: [namedImport([func], `./${kebabCase(field.type)}-enum`)],
				func: `${func}('${field.getDbName()}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#bigint
		BigInt(field) {
			const isUnsigned = getNativeType(field)?.name === 'UnsignedBigInt'

			return createField({
				field,
				imports: [namedImport(['bigint'], coreModule)],
				func: (opts: { mode?: BigIntMode }) =>
					renderColumn('bigint', field.getDbName(), {
						mode: `'${opts?.mode ?? 'bigint'}'`,
						unsigned: isUnsigned ? true : undefined,
					}),
				onDefault: onAutoincrementDefault,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#boolean
		Boolean(field) {
			return createField({
				field,
				imports: [namedImport(['boolean'], coreModule)],
				func: `boolean('${field.getDbName()}')`,
			})
		},
		Bytes(field) {
			return createField({
				field,
				imports: [namedImport(['customBytes'], `./${customBytesModule.name}`)],
				func: `customBytes('${field.getDbName()}')`,
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql#datetime
		DateTime(field) {
			const mode = `'${getDateMode(field)}'`
			const native = getNativeType(field)

			switch (native?.name) {
				case 'DateTime':
					return createDateTimeColumn(field, 'datetime', {
						mode,
						fsp: native.args[0],
					})
				case 'Timestamp':
					return createDateTimeColumn(field, 'timestamp', {
						mode,
						fsp: native.args[0],
					})
				case 'Date':
					// MySQL rejects CURRENT_TIMESTAMP as the default of DATE and TIME columns
					return createDateTimeColumn(field, 'date', { mode }, '(CURRENT_DATE)')
				case 'Time':
					return createDateTimeColumn(
						field,
						'time',
						{ fsp: native.args[0] },
						`(${currentExpression('CURRENT_TIME', native.args[0])})`,
						(field) => onTimeDefault(field, false)
					)
				default:
					return createDateTimeColumn(field, 'datetime', { mode, fsp: 3 })
			}
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#decimal
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
		// https://orm.drizzle.team/docs/column-types/mysql/#float
		Float(field) {
			return createColumn(
				field,
				getNativeType(field)?.name === 'Double' ? 'double' : 'float'
			)
		},
		// https://orm.drizzle.team/docs/column-types/mysql#integer
		Int(field) {
			const native = getNativeType(field)
			const column = native && intColumns[native.name]
			if (column == null) {
				return createColumn(field, 'int', undefined, onAutoincrementDefault)
			}

			return createColumn(
				field,
				column.builder,
				{ unsigned: column.unsigned },
				onAutoincrementDefault
			)
		},
		// https://orm.drizzle.team/docs/column-types/mysql#json
		Json(field) {
			return createField({
				field,
				imports: [namedImport(['json'], coreModule)],
				func: `json('${field.getDbName()}')`,
				onDefault: (field) => ({
					code: `.$defaultFn(() => (${field.default}))`,
				}),
			})
		},
		// https://orm.drizzle.team/docs/column-types/mysql/#text
		String(field) {
			const native = getNativeType(field)

			switch (native?.name) {
				case 'VarChar':
					return createColumn(field, 'varchar', { length: native.args[0] })
				case 'Char':
					return createColumn(field, 'char', { length: native.args[0] })
				case 'TinyText':
					return createColumn(field, 'tinytext')
				case 'MediumText':
					return createColumn(field, 'mediumtext')
				case 'LongText':
					return createColumn(field, 'longtext')
				default:
					return createColumn(field, 'text')
			}
		},
	},
	extraModules: [customBytesModule],
})
