import { createValue } from '../createValue'
import { lambdaValue } from './lambdaValue'

describe('lambdaValue', () => {
  test('renders correctly', () => {
    const args = createValue({
      render() {
        return 'x'
      },
    })
    const returnVal = createValue({
      render() {
        return 'x + 1'
      },
    })
    const expected = '(x) => { return x + 1; }'
    const result = lambdaValue(args, returnVal).render()
    expect(result).toBe(expected)
  })
})
