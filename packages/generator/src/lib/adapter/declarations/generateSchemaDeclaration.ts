import { camelCase } from 'lodash'
import { Module } from '~/lib/syntaxes/module'
import { wildcardImport } from '../../syntaxes/imports'

export function generateSchemaDeclaration(models: Module[]) {
	const aliasFor = (m: Module) => camelCase(m.name)

	return {
		imports: models.map((m) => wildcardImport(aliasFor(m), `./${m.name}`)),
		code: `export const schema = { ${models
			.map((m) => `...${aliasFor(m)}`)
			.join(', ')} };`,
	}
}
