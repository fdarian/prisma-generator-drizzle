import { createValue } from '../createValue'

export function useVar(name: string) {
  return createValue({
    render() {
      return name
    },
  })
}

export type UseVar = ReturnType<typeof useVar>
