import { createDef, Definition } from '../createDef'
import { UseVar } from './useVar'

export type Entry = [string, Definition]

export function object(
  entries: Record<string, Definition | undefined> | (Entry | UseVar)[]
) {
  const _entries = Array.isArray(entries) ? entries : Object.entries(entries)

  return createDef({
    render(): string {
      if (entries.length === 0) return `{}`
      return `{ ${_entries
        .flatMap((entryOrVar) => {
          if (!Array.isArray(entryOrVar)) return [`...${entryOrVar.render()}`]
          return entryOrVar[1] != null
            ? [`${entryOrVar[0]}: ${entryOrVar[1].render()}`]
            : []
        })
        .join(', ')} }`
    },
  })
}
