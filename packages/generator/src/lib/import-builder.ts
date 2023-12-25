import { v } from './value'

export class ImportBuilder {
  importMap = new Map<string, Set<string>>()

  add(pathToModule: string, name: string) {
    const val = this.importMap.get(pathToModule) ?? new Set()
    this.importMap.set(pathToModule, val)
    val.add(name)
  }

  toDeclaration() {
    return [...this.importMap.entries()].map(([modulePath, names]) =>
      v.namedImport([...names], modulePath)
    )
  }
}
