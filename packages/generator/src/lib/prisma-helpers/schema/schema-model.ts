import type { Model, Schema } from '@mrleebo/prisma-ast'
import type { DMMF } from '@prisma/generator-helper'
import { getDbName } from '../getDbName'
import { getModelModuleName, getModelVarName } from '../model'
import { createSchemaField, findCorrespondingAstField } from './schema-field'

export type SchemaModel = ReturnType<typeof createSchemaModel>

export function createSchemaModel(args: {
	astModel?: Model
	dmmfModel: DMMF.Model
}) {
	const { astModel, dmmfModel } = args

	return {
		ast: astModel,
		dmmf: dmmfModel,
		getDbName() {
			return getDbName(dmmfModel)
		},
		getVarName() {
			return getModelVarName(dmmfModel)
		},
		getModuleName() {
			return getModelModuleName(dmmfModel)
		},
	}
}

export function getModelFields(model: SchemaModel) {
	return model.dmmf.fields.map((dmmfField) => {
		return createSchemaField({
			model,
			dmmfField,
			astField: model.ast
				? findCorrespondingAstField(model, dmmfField)
				: undefined,
		})
	})
}

export function findCorrespondingAstModel(
	astSchema: Schema,
	dmmfModel: DMMF.Model
) {
	const astModel = astSchema.list.find(
		(block) => block.type === 'model' && block.name === dmmfModel.name
	)
	if (astModel?.type !== 'model')
		throw new Error(`Cannot find corresponding ast model for ${dmmfModel.name}`)
	return astModel
}
