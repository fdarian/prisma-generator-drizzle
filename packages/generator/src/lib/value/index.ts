import { numberValue } from 'src/lib/value/types/numberValue'
import { stringValue } from 'src/lib/value/types/stringValue'
import { objectValue } from 'src/lib/value/types/objectValue'
import { funcValue } from 'src/lib/value/types/funcValue'
import { useVarValue } from './types/useVarValue'
import { lambdaValue } from './types/lambdaValue'
import { destructureValue } from './types/destructureValue'
import { arrayValue } from './types/arrayValue'
import {
  defaultImportValue,
  namedImportValue,
  wildcardImportValue,
} from './types/import'
import { defineVar } from './types/defineVar'

export const v = {
  number: numberValue,
  string: stringValue,
  object: objectValue,
  func: funcValue,
  useVar: useVarValue,
  defineVar: defineVar,
  lambda: lambdaValue,
  destructure: destructureValue,
  array: arrayValue,
  namedImport: namedImportValue,
  wilcardImport: wildcardImportValue,
  defaultImport: defaultImportValue,
}
