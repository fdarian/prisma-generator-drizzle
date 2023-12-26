import { createDef } from '../createDef'

export function number(value: number) {
  return createDef({
    render: () => `${value}`,
  })
}
