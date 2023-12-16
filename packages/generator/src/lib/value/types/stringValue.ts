import { createValue } from '../createValue'

export function stringValue(value: string) {
  return createValue({
    render: () => `'${value}'`,
  })
}
