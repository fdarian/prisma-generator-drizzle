import { DMMF } from '@prisma/generator-helper'
import { map } from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { camelCase, kebabCase } from 'lodash'
import pluralize from 'pluralize'
import { array } from '~/lib/definitions/types/array'
import { string } from '~/lib/definitions/types/string'
import {
  PrismaRelationField,
  isRelationField,
} from '~/lib/prisma-helpers/field'
import { getDbName } from '~/lib/prisma-helpers/getDbName'
import { getModelVarName } from '~/lib/prisma-helpers/model'
import { createDef } from '../../definitions/createDef'
import { constDeclaration } from '../../definitions/types/constDeclaration'
import { funcCall } from '../../definitions/types/funcCall'
import { namedImport } from '../../definitions/types/imports'
import { lambda } from '../../definitions/types/lambda'
import { object } from '../../definitions/types/object'
import { useVar } from '../../definitions/types/useVar'

type GenerateTableRelationsInput = {
  model: DMMF.Model
  tableVarName: string
  fields: PrismaRelationField[]
  datamodel: DMMF.Datamodel
}

export function generateTableRelationsDeclaration(
  input: GenerateTableRelationsInput
) {
  const _fields = input.fields.map(getRelationField(input))

  return createDef({
    imports: [
      namedImport(['relations'], 'drizzle-orm'),
      ..._fields.flatMap((field) => field.imports),
    ],
    implicit: _fields.flatMap((field) => field.implicit),
    render: constDeclaration(
      `${input.tableVarName}Relations`,
      funcCall('relations', [
        useVar(input.tableVarName),
        lambda(
          useVar('helpers'),
          object(_fields.map((field) => [field.name, field]))
        ),
      ]),
      { export: true }
    ),
  })
}

function getRelationField(ctx: GenerateTableRelationsInput) {
  return function (field: PrismaRelationField) {
    const { implicit, opts, referenceModelVarName } = !field.isList
      ? getOneToOneOrManyRelation(field, ctx)
      : opposingIsList(field, ctx)
        ? getManyToManyRelation(field, ctx)
        : getManyToOneRelation(field)

    return createDef({
      name: field.name,
      implicit: implicit,
      imports: [
        namedImport(
          [referenceModelVarName],
          `./${kebabCase(referenceModelVarName)}`
        ),
      ],
      render: funcCall(field.isList ? 'helpers.many' : 'helpers.one', [
        useVar(referenceModelVarName),
        ...(opts ? [object(opts)] : []),
      ]),
    })
  }
}

class DetermineRelationshipError extends Error {
  constructor(field: DMMF.Field, message: string) {
    super(`Cannot determine relationship ${field.relationName}, ${message}`)
  }
}

function getManyToManyRelation(
  field: PrismaRelationField,
  ctx: GenerateTableRelationsInput
) {
  const opposingModel = findOpposingRelationModel(field, ctx.datamodel)
  const joinTable = createImplicitJoinTable(field.relationName, [
    ctx.model,
    opposingModel,
  ])

  return createRelation({
    referenceModelVarName: getModelVarName(joinTable.varName),
    implicit: [joinTable.model],
  })
}

function createRelation(input: {
  referenceModelVarName: string
  opts?: ReturnType<typeof createRelationOpts>
  implicit?: DMMF.Model[]
}) {
  return {
    referenceModelVarName: input.referenceModelVarName,
    opts: input.opts ?? null,
    implicit: input.implicit ?? [],
  }
}

function getOneToOneOrManyRelation(
  field: PrismaRelationField,
  ctx: GenerateTableRelationsInput
) {
  if (hasReference(field)) {
    const opts = createRelationOpts({
      relationName: field.relationName,
      from: {
        modelVarName: getModelVarName(ctx.model),
        fieldNames: field.relationFromFields,
      },
      to: {
        modelVarName: getModelVarName(field.type),
        fieldNames: field.relationToFields,
      },
    })
    return createRelation({
      referenceModelVarName: getModelVarName(field.type),
      opts,
    })
  }

  // For disambiguating relation

  const opposingModel = findOpposingRelationModel(field, ctx.datamodel)
  const opposingField = findOpposingRelationField(field, opposingModel)
  const opts = createRelationOpts({
    relationName: field.relationName,
    from: {
      modelVarName: getModelVarName(ctx.model),
      fieldNames: opposingField.relationToFields,
    },
    to: {
      modelVarName: getModelVarName(field.type),
      fieldNames: opposingField.relationFromFields,
    },
  })

  return createRelation({
    referenceModelVarName: getModelVarName(field.type),
    opts,
  })
}

function getManyToOneRelation(field: PrismaRelationField) {
  const opts = createRelationOpts({ relationName: field.relationName })
  return createRelation({
    referenceModelVarName: getModelVarName(field.type),
    opts,
  })
}

/**
 * Construct Drizzle's `relation()` syntax
 * https://orm.drizzle.team/docs/rqb#declaring-relations
 */
function createRelationOpts(input: {
  relationName?: string
  to?: {
    modelVarName: string
    fieldNames: string[]
  }
  from?: {
    modelVarName: string
    fieldNames: string[]
  }
}) {
  const { relationName, from, to } = input

  return {
    relationName: relationName ? string(relationName) : undefined,
    fields: from
      ? pipe(
          from.fieldNames,
          map((fieldName) => useVar(`${from.modelVarName}.${fieldName}`)),
          array
        )
      : undefined,
    references: to
      ? pipe(
          to.fieldNames,
          map((fieldName) => useVar(`${to.modelVarName}.${fieldName}`)),
          array
        )
      : undefined,
  }
}

/**
 * @param baseName The `field.relationName` referring to the generated join table
 * @param models Two models having a many-to-many relationship
 */
function createImplicitJoinTable(
  baseName: string,
  models: [DMMF.Model, DMMF.Model]
) {
  const pair = models.map(getDbName).sort()

  // Custom varName following drizzle's convention
  const name = pipe(pair, map(pluralize), (names) => names.join('To'))
  const varName = camelCase(name)

  const model = {
    name: name,
    dbName: `_${baseName}`,
    fields: [
      {
        name: 'A',
        kind: 'scalar',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: false,
        hasDefaultValue: false,
        type: 'String',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: camelCase(pair[0]),
        kind: 'object',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: false,
        hasDefaultValue: false,
        type: pair[0],
        // relationName: `${baseName}_A`,
        relationFromFields: ['A'],
        relationToFields: ['id'],
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'B',
        kind: 'scalar',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: false,
        hasDefaultValue: false,
        type: 'String',
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: camelCase(pair[1]),
        kind: 'object',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: false,
        hasDefaultValue: false,
        type: pair[1],
        // relationName: `${baseName}_B`,
        relationFromFields: ['B'],
        relationToFields: ['id'],
        isGenerated: false,
        isUpdatedAt: false,
      },
    ],
    primaryKey: { name: null, fields: ['A', 'B'] },
    uniqueFields: [],
    uniqueIndexes: [],
    isGenerated: false,
  } satisfies DMMF.Model

  return { varName, baseName, model, pair }
}

function findOpposingRelationModel(
  field: PrismaRelationField,
  datamodel: DMMF.Datamodel
) {
  const opposingModel = datamodel.models.find((m) => m.name === field.type)
  if (opposingModel) return opposingModel
  throw new DetermineRelationshipError(field, `model ${field.type} not found`)
}

function findOpposingRelationField(
  field: PrismaRelationField,
  opposingModel: DMMF.Model
) {
  const opposingField = opposingModel.fields.find(
    (f) => f.relationName === field.relationName && isRelationField(f)
  )
  if (opposingField) return opposingField as PrismaRelationField
  throw new DetermineRelationshipError(
    field,
    `field with relation ${field.relationName} not found`
  )
}

/**
 * Not a derived relation in which the model holds the reference.
 * Can be one-to-one or one-to-many
 */
function hasReference(field: PrismaRelationField) {
  return (
    field.relationFromFields.length > 0 && field.relationToFields.length > 0
  )
}

function opposingIsList(
  field: PrismaRelationField,
  ctx: GenerateTableRelationsInput
) {
  const opposingModel = findOpposingRelationModel(field, ctx.datamodel)
  return findOpposingRelationField(field, opposingModel).isList
}
