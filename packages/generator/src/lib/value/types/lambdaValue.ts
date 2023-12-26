import { IValue, createValue } from '../createValue'
import { DestructureValue } from './destructureValue'

export function args(name: string, type: string) {
  return createValue({
    render() {
      return `${name}: ${type}`
    },
  })
}
type ArgsValue = ReturnType<typeof args>

export function lambdaValue(
  args: DestructureValue | ArgsValue,
  returnVal: IValue
) {
  return createValue({
    render() {
      return `(${args.render()}) => { return ${returnVal.render()}; }`
    },
  })
}
