import { map } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { camelCase } from 'lodash'
import { array } from '~/lib/definitions/types/array'
import { string } from '~/lib/definitions/types/string'
import { PrismaRelationField } from '~/lib/prisma-helpers/field'
import { getModelModuleName, getModelVarName } from '~/lib/prisma-helpers/model'
import { Definition, createDef } from '../../definitions/createDef'
import { constDeclaration } from '../../definitions/types/constDeclaration'
import { funcCall } from '../../definitions/types/funcCall'
import { namedImport } from '../../definitions/types/imports'
import { lambda } from '../../definitions/types/lambda'
import { object } from '../../definitions/types/object'
import { useVar } from '../../definitions/types/useVar'

export function generateTableRelationsDeclaration(
  tableVarName: string,
  fields: PrismaRelationField[]
) {
  const _fields = fields.map(getRelationField(tableVarName))

  return createDef({
    imports: [
      namedImport(['relations'], 'drizzle-orm'),
      ..._fields.flatMap((field) => field.imports),
    ],
    render: constDeclaration(
      `${tableVarName}Relations`,
      funcCall('relations', [
        useVar(tableVarName),
        lambda(
          useVar('helpers'),
          object(_fields.map((field) => [field.name, field]))
        ),
      ]),
      { export: true }
    ),
  })
}

function getRelationField(tableVarName: string) {
  return function (field: PrismaRelationField) {
    const relationVarName = getModelVarName(field.type)

    const opts: Partial<
      Record<'relationName' | 'fields' | 'references', Definition>
    > = {
      relationName: string(field.relationName),
    }

    if (hasReference(field)) {
      opts.fields = pipe(
        field.relationFromFields,
        map((f) => useVar(`${tableVarName}.${camelCase(f)}`)),
        array
      )
      opts.references = pipe(
        field.relationToFields,
        map((f) => useVar(`${relationVarName}.${camelCase(f)}`)),
        array
      )
    }

    const func = funcCall(field.isList ? 'helpers.many' : 'helpers.one', [
      useVar(relationVarName),
      object(opts),
    ])

    return createDef({
      name: field.name,
      imports: [
        namedImport([relationVarName], `./${getModelModuleName(field.type)}`),
      ],
      render: func.render,
    })
  }
}

/**
 * Not a derived relation in which the model holds the reference
 */
function hasReference(field: PrismaRelationField) {
  return (
    field.relationFromFields.length > 0 && field.relationToFields.length > 0
  )
}
