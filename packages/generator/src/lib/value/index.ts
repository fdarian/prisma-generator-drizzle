import { numberValue } from 'src/lib/value/types/numberValue'
import { stringValue } from 'src/lib/value/types/stringValue'
import { objectValue } from 'src/lib/value/types/objectValue'
import { funcValue } from 'src/lib/value/types/funcValue'
import { useVar } from './types/useVar'
import { lambdaValue } from './types/lambdaValue'
import { destructureValue } from './types/destructureValue'
import { arrayValue } from './types/arrayValue'
import { defaultImportValue, namedImport, wildcardImport } from './types/import'
import { constDeclaration } from './types/constDeclaration'

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
