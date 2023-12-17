import { destructureValue } from './destructureValue'
import { createValue } from '../createValue'

describe('destructureValue', () => {
  test('renders correctly', () => {
    const keys = ['key1', 'key2', 'key3']
    const expected = '{ key1, key2, key3 }'
    const result = destructureValue(keys).render()
    expect(result).toBe(expected)
  })
})
