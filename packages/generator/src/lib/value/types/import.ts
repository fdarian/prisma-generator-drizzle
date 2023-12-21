import { createValue } from '../createValue'

export function namedImportValue(names: string[], path: string) {
  return createValue({
    render() {
      return `import { ${names.join(', ')} } from '${path}'`
    },
  })
}

export function defaultImportValue(name: string, path: string) {
  return createValue({
    render() {
      return `import ${name} from '${path}'`
    },
  })
}

export function wildcardImportValue(alias: string, path: string) {
  return createValue({
    render() {
      return `import * as ${alias} from '${path}'`
    },
  })
}
