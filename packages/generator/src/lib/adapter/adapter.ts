import type {
	PrismaEnumField,
	PrismaScalarField,
} from '../prisma-helpers/field'
import type { ImportValue } from '../syntaxes/imports'
import type { Module } from '../syntaxes/module'
import type { FieldFunc } from './fields/createField'

export type ParsableField = PrismaScalarField | PrismaEnumField

type DeclarationFunc = { imports: ImportValue[]; func: string }

export function createAdapter<TName extends string>(impl: {
	name: TName
	getDeclarationFunc: {
		enum: (name: string, values: string[]) => DeclarationFunc
		table: (name: string, fields: FieldFunc[]) => DeclarationFunc
	}
	fields: Partial<
		Record<
			PrismaScalarField['type'] | 'enum',
			(field: ParsableField) => FieldFunc
		>
	>
	extraModules?: Module[]
}) {
	return {
		...impl,
		parseField(field: ParsableField) {
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
