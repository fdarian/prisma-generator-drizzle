import { or } from 'fp-ts/lib/Refinement'
import { pipe } from 'fp-ts/lib/function'
import { isKind } from '~/lib/prisma-helpers/field'
import {
	type SchemaModel,
	getModelFields,
} from '~/lib/prisma-helpers/schema/schema-model'
import type { Adapter } from '../types'

export function generateTableDeclaration(adapter: Adapter, model: SchemaModel) {
	const fields = getModelFields(model)
		.filter(pipe(isKind('scalar'), or(isKind('enum'))))
		.map(adapter.parseField)
	const name = model.getVarName()

	const tableDeclaration = adapter.getDeclarationFunc.table(
		model.getDbName(),
		fields
	)

	return {
		name,
		imports: [
			...tableDeclaration.imports,
			...fields.flatMap((field) => field.imports),
		],
		code: `export const ${name} = ${tableDeclaration.func};`,
	}
}
