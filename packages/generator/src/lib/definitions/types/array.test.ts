import { array } from './array'
import { number } from './number'
import { object } from './object'
import { string } from './string'

test('array', () => {
  const values = [
    string('1'),
    number(2),
    object([
      ['a', string('a')],
      ['b', string('b')],
    ]),
  ]

  const result = array(values)

  expect(result.render()).toBe("[ '1', 2, { a: 'a', b: 'b' } ]")
})
