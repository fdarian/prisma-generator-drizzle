import { or } from 'fp-ts/lib/Refinement'
import { pipe } from 'fp-ts/lib/function'
import { isKind } from '~/lib/prisma-helpers/field'
import {
	type ForeignKey,
	getForeignKeys,
} from '~/lib/prisma-helpers/foreign-keys'
import type { Schema } from '~/lib/prisma-helpers/schema/schema'
import {
	type SchemaModel,
	getModelFields,
} from '~/lib/prisma-helpers/schema/schema-model'
import { namedImport } from '~/lib/syntaxes/imports'
import type { Adapter } from '../types'

export function generateTableDeclaration(
	adapter: Adapter,
	schema: Schema,
	model: SchemaModel
) {
	const parsedFields = getModelFields(model)
		.filter(pipe(isKind('scalar'), or(isKind('enum'))))
		.map(adapter.parseField)
	const name = model.getVarName()

	const foreignKeys = getForeignKeys(schema, model)
	const inlineForeignKeys = foreignKeys.filter(isInlineForeignKey)
	const fields = parsedFields.map((field) => {
		const foreignKey = inlineForeignKeys.find(
			(fk) => fk.columns[0] === field.name
		)
		if (foreignKey == null) return field
		return {
			...field,
			func: `${field.func}${createInlineReferences(adapter, foreignKey)}`,
		}
	})

	for (const foreignKey of inlineForeignKeys) {
		if (!parsedFields.some((field) => field.name === foreignKey.columns[0])) {
			throw new Error(
				`Column ${foreignKey.columns[0]} of foreign key in ${name} not found`
			)
		}
	}

	const configForeignKeys = foreignKeys.filter((fk) => !isInlineForeignKey(fk))
	const extraConfigEntries = configForeignKeys.map(createForeignKeyEntry)

	const tableDeclaration = adapter.getDeclarationFunc.table(
		model.getDbName(),
		fields,
		model.getSchema(),
		extraConfigEntries
	)

	return {
		name,
		imports: [
			...tableDeclaration.imports,
			...fields.flatMap((field) => field.imports),
			...(inlineForeignKeys.length > 0
				? [namedImport([adapter.anyColumnType], adapter.coreModule, true)]
				: []),
			...(configForeignKeys.length > 0
				? [namedImport(['foreignKey'], adapter.coreModule)]
				: []),
			...foreignKeys.flatMap((fk) =>
				fk.target.isSelf
					? []
					: [namedImport([fk.target.varName], `./${fk.target.moduleName}`)]
			),
		],
		code: `export const ${name} = ${tableDeclaration.func};`,
	}
}

function isInlineForeignKey(foreignKey: ForeignKey) {
	return foreignKey.columns.length === 1 && foreignKey.name == null
}

function createInlineReferences(adapter: Adapter, foreignKey: ForeignKey) {
	const target = `${foreignKey.target.varName}.${foreignKey.target.columns[0]}`
	return `.references((): ${adapter.anyColumnType} => ${target}, { onDelete: '${foreignKey.onDelete}', onUpdate: '${foreignKey.onUpdate}' })`
}

function createForeignKeyEntry(foreignKey: ForeignKey) {
	const targetRef = foreignKey.target.isSelf
		? 'table'
		: foreignKey.target.varName
	const props = [
		...(foreignKey.name == null ? [] : [`name: '${foreignKey.name}'`]),
		`columns: [${foreignKey.columns.map((c) => `table.${c}`).join(', ')}]`,
		`foreignColumns: [${foreignKey.target.columns.map((c) => `${targetRef}.${c}`).join(', ')}]`,
	]
	return `foreignKey({ ${props.join(', ')} }).onDelete('${foreignKey.onDelete}').onUpdate('${foreignKey.onUpdate}')`
}
