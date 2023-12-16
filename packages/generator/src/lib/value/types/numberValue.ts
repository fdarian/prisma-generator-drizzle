import { createValue } from '../createValue'

export function numberValue(value: number) {
  return createValue({
    render: () => `${value}`,
  })
}
