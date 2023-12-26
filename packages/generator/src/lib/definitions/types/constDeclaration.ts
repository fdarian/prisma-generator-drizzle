import { Definition, createDef } from '../createDef'

export function constDeclaration(
  name: string,
  value: Definition,
  opts?: {
    export?: boolean
  }
) {
  return createDef({
    render() {
      let prefix = ''
      if (opts?.export) prefix = prefix.concat('export')

      return `${prefix} const ${name} = ${value.render()};`
    },
  })
}
