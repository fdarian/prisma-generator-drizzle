import { createValue } from '../createValue'

// #endregion

export function numberValue(value: number) {
  return createValue({
    render: () => `${value}`,
  })
}
