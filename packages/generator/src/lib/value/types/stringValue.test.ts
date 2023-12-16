import { stringValue } from './stringValue'

describe('stringValue', () => {
  test('renders correctly', () => {
    const value = 'hello world'
    const expected = "'hello world'"
    const result = stringValue(value).render()
    expect(result).toBe(expected)
  })
})
