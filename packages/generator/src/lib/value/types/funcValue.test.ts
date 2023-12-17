import { funcValue } from './funcValue'
import { numberValue } from './numberValue'
import { objectValue } from './objectValue'
import { stringValue } from './stringValue'

describe('funcValue', () => {
  test('with one argument', () => {
    const name = 'myFunction'
    const arg = numberValue(1)

    const expected = 'myFunction(1)'
    const result = funcValue(name, [arg]).render()
    expect(result).toBe(expected)
  })

  test('with many arguments', () => {
    const name = 'myFunction'
    const args = [
      numberValue(1),
      objectValue([['key', stringValue('value')]]),
      stringValue('str'),
    ]

    const expected = "myFunction(1, { key: 'value' }, 'str')"
    const result = funcValue(name, args).render()
    expect(result).toBe(expected)
  })

  test('without arguments', () => {
    const name = 'myFunction'

    const expected = 'myFunction()'
    const result = funcValue(name).render()
    expect(result).toBe(expected)
  })

  test('chain', () => {
    const expected = 'func().func(1)'
    const result = funcValue('func')
      .chain(funcValue('func', [numberValue(1)]))
      .render()
    expect(result).toBe(expected)
  })

  test('chain many functions', () => {
    const expected = 'func().func(1).func(2).func(3).func(4)'
    const result = funcValue('func')
      .chain(funcValue('func', [numberValue(1)]))
      .chain(funcValue('func', [numberValue(2)]))
      .chain(funcValue('func', [numberValue(3)]))
      .chain(funcValue('func', [numberValue(4)]))
      .render()
    expect(result).toBe(expected)
  })
})
