import { DMMF } from '@prisma/generator-helper'
import { camelCase, kebabCase, memoize } from 'lodash'
import pluralize from 'pluralize'

export const getModelVarName = memoize((model: DMMF.Model | string) => {
  return camelCase(pluralize(typeof model === 'string' ? model : model.name))
})

export const getModelModuleName = memoize((model: DMMF.Model | string) => {
  return kebabCase(pluralize(typeof model === 'string' ? model : model.name))
})
