import { IValue, createValue } from '../createValue'
import { DestructureValue } from './destructureValue'

export function lambdaValue(args: DestructureValue, returnVal: IValue) {
  return createValue({
    render() {
      return `(${args.render()}) => { return ${returnVal.render()}; }`
    },
  })
}
