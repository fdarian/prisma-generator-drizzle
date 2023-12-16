import { numberValue } from './numberValue'

describe('numberValue', () => {
  test('renders correctly', () => {
    const value = 42
    const expected = '42'
    const result = numberValue(value).render()
    expect(result).toBe(expected)
  })
})
