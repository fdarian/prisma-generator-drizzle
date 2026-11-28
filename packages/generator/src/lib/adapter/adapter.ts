import type { SchemaField } from '../prisma-helpers/schema/schema-field'
import type { ImportValue } from '../syntaxes/imports'
import type { Module } from '../syntaxes/module'
import type { FieldFunc } from './fields/createField'

export type IndexFeatures = {
	sortOrder: boolean
	method: boolean
	primaryKeyName: boolean
	implicitJoinTableKey: 'primaryKey' | 'unique'
}

type DeclarationFunc = { imports: ImportValue[]; func: string }

export function createAdapter<TName extends string>(impl: {
	name: TName
	coreModule: string
	maxIdentifierLength: number
	indexFeatures: IndexFeatures
	getDeclarationFunc: {
		enum: (
			name: string,
			values: string[],
			schema: string | null
		) => DeclarationFunc
		table: (
			name: string,
			fields: FieldFunc[],
			schema: string | null,
			extraConfigEntries: string[]
		) => DeclarationFunc
	}
	fields: Partial<
		Record<SchemaField['type'] | 'enum', (field: SchemaField) => FieldFunc>
	>
	extraModules?: Module[]
	createSchemasModule?: (schemas: string[]) => Module | undefined
}) {
	return {
		...impl,
		parseField(field: SchemaField) {
			const fieldType = field.kind === 'enum' ? 'enum' : field.type
			const fieldFunc =
				fieldType in impl.fields ? impl.fields[fieldType] : undefined

			if (fieldFunc == null) {
				throw new Error(
					`Adapter ${impl.name} does not support ${field.type} field`
				)
			}

			return fieldFunc(field)
		},
	}
}
