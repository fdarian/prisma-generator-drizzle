import { IValue, createValue } from '../createValue'

export function defineVarValue(
  name: string,
  value: IValue,
  opts?: {
    export?: boolean
  }
) {
  return createValue({
    render() {
      let prefix = ''
      if (opts?.export) prefix = prefix.concat('export')

      return `${prefix} const ${name} = ${value.render()};`
    },
  })
}
