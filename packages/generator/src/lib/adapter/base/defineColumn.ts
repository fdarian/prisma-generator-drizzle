import { pipe } from 'fp-ts/lib/function'
import { v } from '../../value'
import { DMMF } from '@prisma/generator-helper'
import { createValue } from '../../value/createValue'
import { IChainableValue } from '../../value/types/funcValue'
import { Adapter } from '../adapter'
import { ImportValue, namedImport } from 'src/lib/value/types/import'

export type DefineImport = {
  module: string
  name: string
}

interface DefineColumnInput<TAdapter extends Adapter> {
  adapter: TAdapter
  field: DMMF.Field
  imports?: ImportValue[]
  columnFunc: IChainableValue
}

export type IColumnValue = ReturnType<typeof defineColumn>

export function defineColumn<TAdapter extends Adapter>(
  input: DefineColumnInput<TAdapter>
) {
  const { field } = input

  const chainable = new ChainableExtension(field)
  const imports = [...(input.imports ?? []), ...chainable.getImports()]

  return createValue({
    imports,
    field: field.name,
    render: pipe(
      input.columnFunc,
      when(chainable.shouldChain(), () => {
        return chainable.getFunc()
      }),
      when(field.isId, () => v.func('primaryKey')),
      when(!field.isId && field.isRequired, () => v.func('notNull'))
    ).render,
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
    return v.func('$type', [], { type: this.type! })
  }

  getImports() {
    if (!this.enabled) return []
    return [namedImport([this.type!], this.module!)]
  }
}
// #endregion
