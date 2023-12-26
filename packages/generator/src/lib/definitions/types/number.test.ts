import { number } from './number'

test('renders correctly', () => {
  const value = 42
  const expected = '42'
  const result = number(value).render()
  expect(result).toBe(expected)
})
