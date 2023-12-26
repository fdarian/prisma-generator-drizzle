import { funcCall } from './funcCall'
import { number } from './number'
import { object } from './object'
import { string } from './string'

test('with one argument', () => {
  const name = 'myFunction'
  const arg = number(1)

  const expected = 'myFunction(1)'
  const result = funcCall(name, [arg]).render()
  expect(result).toBe(expected)
})

test('with many arguments', () => {
  const name = 'myFunction'
  const args = [number(1), object([['key', string('value')]]), string('str')]

  const expected = "myFunction(1, { key: 'value' }, 'str')"
  const result = funcCall(name, args).render()
  expect(result).toBe(expected)
})

test('without arguments', () => {
  const name = 'myFunction'

  const expected = 'myFunction()'
  const result = funcCall(name).render()
  expect(result).toBe(expected)
})

test('chain', () => {
  const expected = 'func().func(1)'
  const result = funcCall('func')
    .chain(funcCall('func', [number(1)]))
    .render()
  expect(result).toBe(expected)
})

test('chain many functions', () => {
  const expected = 'func().func(1).func(2).func(3).func(4)'
  const result = funcCall('func')
    .chain(funcCall('func', [number(1)]))
    .chain(funcCall('func', [number(2)]))
    .chain(funcCall('func', [number(3)]))
    .chain(funcCall('func', [number(4)]))
    .render()
  expect(result).toBe(expected)
})
