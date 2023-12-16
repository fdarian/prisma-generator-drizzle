import { createValue, IValue } from '../createValue'
import { render as renderValue } from '../utils'

interface IFuncValue extends IValue {
  chain(funcValue: IFuncValue): IValue
}

export function funcValue(name: string, args?: IValue[]) {
  function render() {
    return `${name}(${args?.map(renderValue).join(', ') ?? ''})`
  }

  return createValue({
    render,
    chain(funcValue: IFuncValue): IValue {
      return {
        render() {
          return `${render()}.${funcValue.render()}`
        },
      }
    },
  })
}
