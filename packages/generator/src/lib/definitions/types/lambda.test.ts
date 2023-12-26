import { createDef } from '../createDef'
import { lambda } from './lambda'

test('renders correctly', () => {
  const args = createDef({
    render() {
      return 'x'
    },
  })
  const returnVal = createDef({
    render() {
      return 'x + 1'
    },
  })
  const expected = '(x) => { return x + 1; }'
  const result = lambda(args, returnVal).render()
  expect(result).toBe(expected)
})
