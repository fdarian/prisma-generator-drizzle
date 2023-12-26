import { ImportValue } from './types/imports'

type IRenderable = {
  render: () => string
}

type CreateDefOpts = {
  render: IRenderable['render'] | IRenderable
}

export function createDef<TOpts extends CreateDefOpts>(options: TOpts) {
  const { render, ...rest } = options
  return {
    ...rest,
    render: typeof render === 'function' ? render : render.render,
  }
}

export type Definition = ReturnType<typeof createDef>

export interface ImportableDefinition extends Definition {
  imports: ImportValue[]
}
