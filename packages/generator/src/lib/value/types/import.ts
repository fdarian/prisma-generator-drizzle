import { createValue } from '../createValue'

export function namedImport(names: string[], path: string) {
  return createValue({
    type: 'namedImport' as const,
    names: names,
    module: path,
    render() {
      return `import { ${names.join(', ')} } from '${path}';`
    },
  })
}
export type NamedImport = ReturnType<typeof namedImport>

export function defaultImportValue(name: string, path: string) {
  return createValue({
    type: 'defaultImport' as const,
    name,
    module: path,
    render() {
      return `import ${name} from '${path}';`
    },
  })
}

export function wildcardImportValue(alias: string, path: string) {
  return createValue({
    type: 'wildcardImport' as const,
    module: path,
    render() {
      return `import * as ${alias} from '${path}';`
    },
  })
}

export type ImportValue =
  | NamedImport
  | ReturnType<typeof defaultImportValue>
  | ReturnType<typeof wildcardImportValue>
