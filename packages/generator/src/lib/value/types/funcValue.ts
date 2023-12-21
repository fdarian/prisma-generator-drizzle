import { createValue, IValue } from '../createValue'
import { render as renderValue } from '../utils'

export interface IChainableValue extends IValue {
  chain(funcValue: IChainableValue): IChainableValue
}

export function funcValue(
  name: string,
  args?: IValue[],
  opts?: { type?: string }
) {
  function render() {
    let type = ''
    if (opts?.type) type = `<${opts.type}>`
    return `${name}${type}(${args?.map(renderValue).join(', ') ?? ''})`
  }

  return createValue({
    render,
    chain(funcValue: IChainableValue) {
      return chainableValue([render, funcValue.render])
    },
  })
}

function chainableValue(renders: (() => string)[]) {
  return createValue({
    render() {
      return renders.map((render) => render()).join('.')
    },
    chain(funcValue: IChainableValue) {
      return chainableValue([...renders, funcValue.render])
    },
  })
}
