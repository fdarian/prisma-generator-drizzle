import { number } from './number'
import { Entry, object } from './object'
import { string } from './string'

test('with one entry', () => {
  const entries: Entry[] = [['key', string('value')]]

  const expected = "{ key: 'value' }"
  const result = object(entries).render()
  expect(result).toBe(expected)
})

test('with multiple entries', () => {
  const entries: Entry[] = [
    ['key1', string('value1')],
    ['key2', number(2)],
    ['key3', string('value3')],
  ]

  const expected = "{ key1: 'value1', key2: 2, key3: 'value3' }"
  const result = object(entries).render()
  expect(result).toBe(expected)
})

test('with empty entries', () => {
  const entries: Entry[] = []

  const expected = '{}'
  const result = object(entries).render()
  expect(result).toBe(expected)
})

test('with nested', () => {
  const entries: Entry[] = [
    ['key1', string('value1')],
    ['key2', object([['nestedKey', number(42)]])],
    ['key3', string('value3')],
  ]

  const expected = "{ key1: 'value1', key2: { nestedKey: 42 }, key3: 'value3' }"
  const result = object(entries).render()
  expect(result).toBe(expected)
})
