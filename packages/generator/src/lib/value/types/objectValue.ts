import { createValue, IValue } from '../createValue'

export function objectValue(entries: [string, IValue][]) {
  return createValue({
    render(): string {
      return `{ ${entries
        .map(([key, value]) => `${key}: ${value.render()}`)
        .join(', ')} }`
    },
  })
}
