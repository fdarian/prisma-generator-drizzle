import { createValue, IValue } from '../createValue'

export type Entry = [string, IValue]

export function objectValue(entries: Entry[]) {
  return createValue({
    render(): string {
      return `{ ${entries
        .map(([key, value]) => `${key}: ${value.render()}`)
        .join(', ')} }`
    },
  })
}
