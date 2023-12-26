import { IValue, createValue } from '../createValue'

export function namedImportValue(names: string[], path: string) {
  return createValue({
    type: 'namedImport',
    render() {
      return `import { ${names.join(', ')} } from '${path}';`
    },
  })
}

export function defaultImportValue(name: string, path: string) {
  return createValue({
    type: 'defaultImport',
    render() {
      return `import ${name} from '${path}';`
    },
  })
}

export function wildcardImportValue(alias: string, path: string) {
  return createValue({
    type: 'wildcardImport',
    render() {
      return `import * as ${alias} from '${path}';`
    },
  })
}

export type ImportValue =
  | ReturnType<typeof namedImportValue>
  | ReturnType<typeof defaultImportValue>
  | ReturnType<typeof wildcardImportValue>
