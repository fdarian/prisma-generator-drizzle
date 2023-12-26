import { ImportableDefinition } from '../definitions/createDef'
import { PrismaEnumField, PrismaScalarField } from '../prisma-helpers/field'
import { FieldDefinition } from './fields/createField'

type ParsableField = PrismaScalarField | PrismaEnumField

export function createAdapter<TName extends string>(impl: {
  name: TName
  getDeclarationFunc: {
    enum: (name: string, values: string[]) => ImportableDefinition
    table: (name: string, fields: FieldDefinition[]) => ImportableDefinition
  }
  fields: Partial<
    Record<
      PrismaScalarField['type'] | 'enum',
      (field: ParsableField) => FieldDefinition
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
