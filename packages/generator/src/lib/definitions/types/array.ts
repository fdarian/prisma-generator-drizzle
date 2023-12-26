import { Definition, createDef } from '../createDef'

export function array(values: Definition[]) {
  return createDef({
    render(): string {
      return `[ ${values.map((v) => v.render()).join(', ')} ]`
    },
  })
}
