import { createValue } from '../createValue'

export type DestructureValue = ReturnType<typeof destructureValue>

export function destructureValue(keys: string[]) {
  return createValue({
    render(): string {
      return `{ ${keys.join(', ')} }`
    },
  })
}
