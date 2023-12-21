import { createValue, IValue } from '../createValue'
import { UseVarValue } from './useVarValue'

export type Entry = [string, IValue]

export function objectValue(entries: (Entry | UseVarValue)[]) {
  return createValue({
    render(): string {
      if (entries.length === 0) return `{}`
      return `{ ${entries
        .map((entryOrVar) =>
          Array.isArray(entryOrVar)
            ? `${entryOrVar[0]}: ${entryOrVar[1].render()}`
            : `...${entryOrVar.render()}`
        )
        .join(', ')} }`
    },
  })
}
