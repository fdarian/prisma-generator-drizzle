import { destructure } from './destructure'

test('renders correctly', () => {
  const keys = ['key1', 'key2', 'key3']
  const expected = '{ key1, key2, key3 }'
  const result = destructure(keys).render()
  expect(result).toBe(expected)
})
