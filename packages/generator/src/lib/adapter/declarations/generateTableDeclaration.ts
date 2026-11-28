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

	const foreignKeys = getForeignKeys(schema, model, adapter.maxIdentifierLength)

	const tableDeclaration = adapter.getDeclarationFunc.table(
		model.getDbName(),
		parsedFields,
		model.getSchema(),
		foreignKeys.map(createForeignKeyEntry)
	)

	return {
		name,
		imports: [
			...tableDeclaration.imports,
			...parsedFields.flatMap((field) => field.imports),
			...(foreignKeys.length > 0
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

export function createForeignKeyEntry(foreignKey: ForeignKey) {
	const targetRef = foreignKey.target.isSelf
		? 'table'
		: foreignKey.target.varName
	const props = [
		`name: ${JSON.stringify(foreignKey.name)}`,
		`columns: [${foreignKey.columns.map((c) => `table.${c}`).join(', ')}]`,
		`foreignColumns: [${foreignKey.target.columns.map((c) => `${targetRef}.${c}`).join(', ')}]`,
	]
	return `foreignKey({ ${props.join(', ')} }).onDelete('${foreignKey.onDelete}').onUpdate('${foreignKey.onUpdate}')`
}
