import { PrismaEnumField, PrismaScalarField } from '../prisma-helpers/field'
import { ImportValue } from '../syntaxes/imports'
import { FieldFunc } from './fields/createField'

type ParsableField = PrismaScalarField | PrismaEnumField

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
