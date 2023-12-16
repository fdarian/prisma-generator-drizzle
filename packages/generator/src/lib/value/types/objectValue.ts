import { createValue, IValue } from '../createValue'

export type Entry = [string, IValue]

export function objectValue(entries: Entry[]) {
  return createValue({
    render(): string {
      if (entries.length === 0) return `{}`
      return `{ ${entries
        .map(([key, value]) => `${key}: ${value.render()}`)
        .join(', ')} }`
    },
  })
}
