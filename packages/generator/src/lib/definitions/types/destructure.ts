import { createDef } from '../createDef'

export type Destructure = ReturnType<typeof destructure>

export function destructure(keys: string[]) {
  return createDef({
    render(): string {
      return `{ ${keys.join(', ')} }`
    },
  })
}
