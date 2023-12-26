import { funcValue } from 'src/lib/value/types/funcValue'
import { numberValue } from 'src/lib/value/types/numberValue'
import { objectValue } from 'src/lib/value/types/objectValue'
import { stringValue } from 'src/lib/value/types/stringValue'
import { arrayValue } from './types/arrayValue'
import { destructureValue } from './types/destructureValue'
import { defaultImportValue, namedImport, wildcardImport } from './types/import'
import { lambdaValue } from './types/lambdaValue'
import { useVar } from './types/useVar'

export const v = {
  number: numberValue,
  string: stringValue,
  object: objectValue,
  func: funcValue,
  useVar: useVar,
  lambda: lambdaValue,
  destructure: destructureValue,
  array: arrayValue,
  namedImport: namedImport,
  wildcardImport: wildcardImport,
  defaultImport: defaultImportValue,
}
