import { camelCase, sortBy, uniq } from 'lodash'
import { namedImport } from '~/lib/syntaxes/imports'
import { createModule } from '~/lib/syntaxes/module'

export const pgSchemasModuleName = 'pg-schemas'

/** drizzle's `pgSchema('public')` throws, so `public` keeps the plain `pgTable`/`pgEnum` */
export function isPublicSchema(
	schema: string | null
): schema is null | 'public' {
	return schema == null || schema === 'public'
}

export function getPgSchemaVarName(schema: string) {
	return `${camelCase(schema)}Schema`
}

export function getNonPublicSchemas(schemas: string[]) {
	const nonPublic = sortBy(uniq(schemas.filter((s) => !isPublicSchema(s))))

	const bySchemaVar = new Map<string, string>()
	for (const schema of nonPublic) {
		const varName = getPgSchemaVarName(schema)
		if (!/^[A-Za-z_$]/.test(varName)) {
			throw new Error(
				`Cannot derive a valid identifier for @@schema("${schema}"): "${varName}" does not start with a letter`
			)
		}

		const existing = bySchemaVar.get(varName)
		if (existing != null) {
			throw new Error(
				`@@schema("${existing}") and @@schema("${schema}") both map to the variable "${varName}"`
			)
		}
		bySchemaVar.set(varName, schema)
	}

	return nonPublic
}

export function createPgSchemasModule(coreModule: string, schemas: string[]) {
	const nonPublic = getNonPublicSchemas(schemas)
	if (nonPublic.length === 0) return undefined

	return createModule({
		name: pgSchemasModuleName,
		declarations: nonPublic.map((schema) => ({
			imports: [namedImport(['pgSchema'], coreModule)],
			code: `export const ${getPgSchemaVarName(schema)} = pgSchema('${schema}');`,
		})),
	})
}

export function getPgSchemaImport(schema: string) {
	return namedImport([getPgSchemaVarName(schema)], `./${pgSchemasModuleName}`)
}
