import { IValue, createValue } from '../createValue'

export function arrayValue(values: IValue[]) {
  return createValue({
    render(): string {
      return `[ ${values.map((v) => v.render()).join(', ')} ]`
    },
  })
}
