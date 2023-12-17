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
    chain(funcValue: IFuncValue) {
      return chainableValue([render, funcValue.render])
    },
  })
}

function chainableValue(renders: (() => string)[]) {
  return createValue({
    render() {
      return renders.map((render) => render()).join('.')
    },
    chain(funcValue: IFuncValue) {
      return chainableValue([...renders, funcValue.render])
    },
  })
}
