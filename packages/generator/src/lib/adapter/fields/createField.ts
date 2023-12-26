import { DMMF } from '@prisma/generator-helper'
import { pipe } from 'fp-ts/lib/function'
import { ImportValue, namedImport } from '~/lib/definitions/types/imports'
import { createDef } from '../../definitions/createDef'
import { IChainableValue, funcCall } from '../../definitions/types/funcCall'

export type DefineImport = {
  module: string
  name: string
}

interface CreateFieldInput {
  field: DMMF.Field
  imports?: ImportValue[]
  func: IChainableValue
}

export type FieldDefinition = ReturnType<typeof createField>

export function createField(input: CreateFieldInput) {
  const { field } = input

  const chainable = new ChainableExtension(field)
  const imports = [...(input.imports ?? []), ...chainable.getImports()]

  return createDef({
    imports,
    name: field.name,
    render: pipe(
      input.func,
      when(chainable.shouldChain(), () => {
        return chainable.getFunc()
      }),
      when(field.isId, () => funcCall('primaryKey')),
      when(!field.isId && field.isRequired, () => funcCall('notNull'))
    ),
  })
}

function when(shouldChain: boolean, getChainedFunc: () => IChainableValue) {
  return function (func: IChainableValue) {
    if (!shouldChain) return func
    return func.chain(getChainedFunc())
  }
}

// #region Extensions
abstract class Extension {
  abstract shouldChain(): boolean
  abstract getFunc(): IChainableValue

  getImports(): ImportValue[] {
    return []
  }
}

class ChainableExtension extends Extension {
  type: string | undefined
  module: string | undefined
  enabled = false

  constructor(field: DMMF.Field) {
    super()

    if (field.documentation == null) return

    const isDrizzleType = field.documentation.startsWith('drizzle.type ')
    if (!isDrizzleType) return

    const splits = field.documentation
      .replaceAll('drizzle.type', '')
      .trim()
      .split('::')
    if (splits.length !== 2)
      throw new Error(`Invalid type definition: ${field.documentation}`)
    ;[this.module, this.type] = splits
    this.enabled = true
  }

  shouldChain() {
    return this.enabled
  }

  getFunc() {
    if (!this.enabled) throw new Error('Cannot get func when not enabled')
    return funcCall('$type', [], { type: this.type! })
  }

  getImports() {
    if (!this.enabled) return []
    return [namedImport([this.type!], this.module!)]
  }
}
// #endregion
