import { numberValue } from 'src/lib/value/types/numberValue'
import { stringValue } from 'src/lib/value/types/stringValue'
import { objectValue } from 'src/lib/value/types/objectValue'
import { funcValue } from 'src/lib/value/types/funcValue'

export const v = {
  number: numberValue,
  string: stringValue,
  object: objectValue,
  func: funcValue,
}
