import { createValue, IValue } from '../createValue'
import { UseVar } from './useVar'

export type Entry = [string, IValue]

export function objectValue(
  entries: Record<string, IValue> | (Entry | UseVar)[]
) {
  const _entries = Array.isArray(entries) ? entries : Object.entries(entries)

  return createValue({
    render(): string {
      if (entries.length === 0) return `{}`
      return `{ ${_entries
        .map((entryOrVar) =>
          Array.isArray(entryOrVar)
            ? `${entryOrVar[0]}: ${entryOrVar[1].render()}`
            : `...${entryOrVar.render()}`
        )
        .join(', ')} }`
    },
  })
}
