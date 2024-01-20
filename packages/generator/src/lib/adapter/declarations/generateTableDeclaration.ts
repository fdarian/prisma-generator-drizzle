import { DMMF } from '@prisma/generator-helper'
import { or } from 'fp-ts/lib/Refinement'
import { pipe } from 'fp-ts/lib/function'
import { isKind } from '~/lib/prisma-helpers/field'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { getModelVarName } from '~/lib/prisma-helpers/model'
import { Adapter } from '../types'

export function generateTableDeclaration(adapter: Adapter, model: DMMF.Model) {
	const fields = model.fields
		.filter(pipe(isKind('scalar'), or(isKind('enum'))))
		.map(adapter.parseField)
	const name = getModelVarName(model)

	const tableDeclaration = adapter.getDeclarationFunc.table(
		getDbName(model),
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
