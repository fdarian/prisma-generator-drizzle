import { IValue, createValue } from '../createValue'
import { DestructureValue } from './destructureValue'

function args(name: string, type: string) {
  return createValue({
    render() {
      return `${name}: ${type}`
    },
  })
}
type ArgsValue = ReturnType<typeof args>

export function defineLambda(args: ArgsValue, returnVal: IValue) {
  return createValue({
    render() {
      return `(${args.render()}) => { return ${returnVal.render()}; }`
    },
  })
}
