import { Entry, objectValue } from './objectValue'
import { stringValue } from './stringValue'
import { numberValue } from './numberValue'

describe('objectValue', () => {
  test('with one entry', () => {
    const entries: Entry[] = [['key', stringValue('value')]]

    const expected = "{ key: 'value' }"
    const result = objectValue(entries).render()
    expect(result).toBe(expected)
  })

  test('with multiple entries', () => {
    const entries: Entry[] = [
      ['key1', stringValue('value1')],
      ['key2', numberValue(2)],
      ['key3', stringValue('value3')],
    ]

    const expected = "{ key1: 'value1', key2: 2, key3: 'value3' }"
    const result = objectValue(entries).render()
    expect(result).toBe(expected)
  })

  test('with empty entries', () => {
    const entries: Entry[] = []

    const expected = '{}'
    const result = objectValue(entries).render()
    expect(result).toBe(expected)
  })

  test('with nested', () => {
    const entries: Entry[] = [
      ['key1', stringValue('value1')],
      ['key2', objectValue([['nestedKey', numberValue(42)]])],
      ['key3', stringValue('value3')],
    ]

    const expected =
      "{ key1: 'value1', key2: { nestedKey: 42 }, key3: 'value3' }"
    const result = objectValue(entries).render()
    expect(result).toBe(expected)
  })
})
