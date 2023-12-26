import { string } from './string'

test('renders correctly', () => {
  const value = 'hello world'
  const expected = "'hello world'"
  const result = string(value).render()
  expect(result).toBe(expected)
})
