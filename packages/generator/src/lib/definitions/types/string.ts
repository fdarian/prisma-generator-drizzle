import { createDef } from '../createDef'

export function string(value: string) {
  return createDef({
    render: () => `'${value}'`,
  })
}
