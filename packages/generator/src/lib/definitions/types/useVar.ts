import { createDef } from '../createDef'

export function useVar(name: string) {
  return createDef({
    render() {
      return name
    },
  })
}

export type UseVar = ReturnType<typeof useVar>
