import { arrayValue } from './arrayValue'
import { numberValue } from './numberValue'
import { objectValue } from './objectValue'
import { stringValue } from './stringValue'

test('arrayValue', () => {
  const values = [
    stringValue('1'),
    numberValue(2),
    objectValue([
      ['a', stringValue('a')],
      ['b', stringValue('b')],
    ]),
  ]

  const result = arrayValue(values)

  expect(result.render()).toBe("[ '1', 2, { a: 'a', b: 'b' } ]")
})
