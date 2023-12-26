import { Definition, createDef } from '../createDef'
import { Destructure } from './destructure'

export function args(name: string, type: string) {
  return createDef({
    render() {
      return `${name}: ${type}`
    },
  })
}
type ArgsValue = ReturnType<typeof args>

export const emptyArgs = createDef({ render: () => '' })

export function lambda(
  args: Destructure | ArgsValue | null,
  returnVal: Definition
) {
  return createDef({
    render() {
      return `(${args?.render() ?? ''}) => { return ${returnVal.render()}; }`
    },
  })
}
