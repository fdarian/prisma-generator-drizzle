import { createValue } from '../createValue'

export function useVarValue(name: string) {
  return createValue({
    render() {
      return name
    },
  })
}

export type UseVarValue = ReturnType<typeof useVarValue>
