import { createDef, Definition } from '../createDef'
import { render as renderValue } from '../utils'

export interface IChainableValue extends Definition {
  chain(funcValue: IChainableValue): IChainableValue
}

export function funcCall(
  name: string,
  args?: Definition[],
  opts?: { type?: string }
) {
  function render() {
    let type = ''
    if (opts?.type) type = `<${opts.type}>`
    return `${name}${type}(${args?.map(renderValue).join(', ') ?? ''})`
  }

  return createDef({
    render,
    chain(funcValue: IChainableValue) {
      return chainableValue([render, funcValue.render])
    },
  })
}

function chainableValue(renders: (() => string)[]) {
  return createDef({
    render() {
      return renders.map((render) => render()).join('.')
    },
    chain(funcValue: IChainableValue) {
      return chainableValue([...renders, funcValue.render])
    },
  })
}
