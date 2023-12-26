import { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase } from 'lodash'
import pluralize from 'pluralize'

export function getModelVarName(model: DMMF.Model | string) {
  return camelCase(pluralize(typeof model === 'string' ? model : model.name))
}

export function getModelModuleName(model: DMMF.Model | string) {
  return kebabCase(pluralize(typeof model === 'string' ? model : model.name))
}
