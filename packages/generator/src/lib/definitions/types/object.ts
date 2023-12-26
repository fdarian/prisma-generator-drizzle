import { createDef, Definition } from '../createDef'
import { UseVar } from './useVar'

export type Entry = [string, Definition]

export function object(
  entries: Record<string, Definition> | (Entry | UseVar)[]
) {
  const _entries = Array.isArray(entries) ? entries : Object.entries(entries)

  return createDef({
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
