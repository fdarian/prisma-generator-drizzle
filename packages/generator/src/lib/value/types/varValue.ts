import { createValue } from '../createValue'

export function varValue(name: string) {
  return createValue({
    render() {
      return name
    },
  })
}
