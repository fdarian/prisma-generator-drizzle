import { createValue, IValue } from '../createValue'
import { render } from '../utils'

export function funcValue(name: string, args?: IValue[]) {
  return createValue({
    render() {
      return `${name}(${args?.map(render).join(', ') ?? ''})`
    },
  })
}
